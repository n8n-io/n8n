import type {
	WhatsAppBusinessProfile,
	WhatsAppCredentialCheck,
	WhatsAppMetaStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { LruCache } from '@n8n/utils/lru-cache';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { createHmac } from 'node:crypto';

import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { numberProperty, stringProperty } from '../../integration-helpers';
import { resolveWhatsAppMetaState } from './whatsapp-meta-status';

const WHATSAPP_CREDENTIAL_TYPE = 'whatsAppBotApi';

/** The version the pinned `@chat-adapter/whatsapp` sends to, so both see the same API. */
export const GRAPH_API_BASE_URL = 'https://graph.facebook.com/v25.0';

/**
 * The token on the API Setup page lasts about 24 hours. A permanent system
 * user token never expires, so anything that ends this soon will stop the
 * channel within days of connecting it.
 */
const TEMPORARY_TOKEN_WINDOW_MS = 48 * 60 * 60 * 1000;

/** The check gates a button, so a stalled request has to give up quickly. */
const CHECK_TIMEOUT_MS = 30_000;

const MAX_LOGGED_ERROR_LENGTH = 500;

/**
 * The settings and the channel chip ask for the Meta status on a timer. A
 * short cache keeps one Meta call per number for all of them. Meta takes days
 * to change a review, so 30 seconds only hides how often it is asked.
 */
const META_STATUS_CACHE_TTL_MS = 30_000;
const META_STATUS_CACHE_SIZE = 200;

interface GraphResponse {
	statusCode: number;
	body: unknown;
}

@Service()
export class WhatsAppCredentialCheckService {
	private readonly metaStatusCache = new LruCache<
		string,
		{ expiresAt: number; status: WhatsAppMetaStatus }
	>(META_STATUS_CACHE_SIZE);

	/** Callers that ask while a read is under way share it. */
	private readonly metaStatusInFlight = new Map<string, Promise<WhatsAppMetaStatus>>();

	constructor(
		private readonly credentialLookup: AgentCredentialLookupService,
		private readonly outboundHttp: OutboundHttp,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
	) {}

	/**
	 * Calls Meta with the credential exactly as the channel will. Each request
	 * carries an `appsecret_proof`, which Meta rejects when the app secret does
	 * not belong to the token's app, so a wrong secret fails here and not on the
	 * first inbound webhook.
	 */
	async check(
		user: User,
		projectId: string,
		credentialId: string,
	): Promise<WhatsAppCredentialCheck> {
		// Scoped to the caller: this sends the token to Meta, and naming a
		// credential is not the same as being allowed to use it.
		const data = await this.credentialLookup.decryptForUser(
			user,
			projectId,
			credentialId,
			WHATSAPP_CREDENTIAL_TYPE,
		);
		// Same answer as connecting the channel gives. Reporting this as
		// `incomplete` would send the user to fix fields that are not empty.
		if (!data) throw new NotFoundError(`WhatsApp credential "${credentialId}" not found`);

		// Trimmed the way the channel trims them.
		const accessToken = stringProperty(data, 'accessToken')?.trim();
		const phoneNumberId = stringProperty(data, 'phoneNumberId')?.trim();
		const businessAccountId = stringProperty(data, 'businessAccountId')?.trim();
		const appSecret = stringProperty(data, 'appSecret')?.trim();
		if (!accessToken || !phoneNumberId || !businessAccountId || !appSecret) {
			return { status: 'failed', reason: 'incomplete' };
		}

		const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
		const get = async (path: string, qs: Record<string, string> = {}) =>
			await this.get(path, accessToken, { ...qs, appsecret_proof: proof });

		try {
			const phone = await get(`/${encodeURIComponent(phoneNumberId)}`, {
				fields: 'display_phone_number,verified_name',
			});
			if (phone.statusCode !== 200) return this.refused('phone number', phone);

			const [expiresAt, accountNumbers, profile] = await Promise.all([
				this.tokenExpiry(accessToken, proof),
				get(`/${encodeURIComponent(businessAccountId)}/phone_numbers`, {
					fields: 'id',
					limit: '100',
				}),
				get(`/${encodeURIComponent(phoneNumberId)}/whatsapp_business_profile`, {
					fields: 'about,description,profile_picture_url',
				}).catch(() => undefined),
			]);

			if (
				expiresAt !== undefined &&
				expiresAt - Date.now() < TEMPORARY_TOKEN_WINDOW_MS &&
				!this.agentsConfig.whatsAppAllowTemporaryToken
			) {
				return { status: 'failed', reason: 'temporaryToken' };
			}

			if (accountNumbers.statusCode !== 200) {
				return this.refused('business account', accountNumbers);
			}
			if (!listedIds(accountNumbers.body).includes(phoneNumberId)) {
				this.logger.debug('[WhatsAppCredentialCheck] Phone number is not in the business account');
				return { status: 'failed', reason: 'mismatch' };
			}

			return {
				status: 'ok',
				profile: toProfile(phone.body, profile?.statusCode === 200 ? profile.body : undefined),
			};
		} catch (error) {
			// Only the cleaned message: the raw error can carry the request config,
			// which holds the access token and the `appsecret_proof`.
			this.logger.debug('[WhatsAppCredentialCheck] Could not reach Meta', {
				error: sanitizeErrorDetail(ensureError(error).message, MAX_LOGGED_ERROR_LENGTH),
			});
			return { status: 'failed', reason: 'unreachable' };
		}
	}

	/**
	 * Reads where Meta's review of the number, display name and business stands.
	 * A failed read gives `unknown` and not an error: this runs on a poll, and a
	 * Meta outage must not show as a problem with the channel.
	 */
	async getMetaStatus(
		user: User,
		projectId: string,
		credentialId: string,
	): Promise<WhatsAppMetaStatus> {
		const data = await this.credentialLookup.decryptForUser(
			user,
			projectId,
			credentialId,
			WHATSAPP_CREDENTIAL_TYPE,
		);
		if (!data) throw new NotFoundError(`WhatsApp credential "${credentialId}" not found`);

		const accessToken = stringProperty(data, 'accessToken')?.trim();
		const phoneNumberId = stringProperty(data, 'phoneNumberId')?.trim();
		const businessAccountId = stringProperty(data, 'businessAccountId')?.trim();
		const appSecret = stringProperty(data, 'appSecret')?.trim();
		if (!accessToken || !phoneNumberId || !businessAccountId || !appSecret) {
			return { state: 'unknown' };
		}

		// The caller was checked above. The key names the credential as well as the
		// number, so a credential that holds the same ids and a bad token does not
		// read the answer of a working one.
		const key = `${credentialId}:${phoneNumberId}:${businessAccountId}`;
		const cached = this.metaStatusCache.get(key);
		if (cached && cached.expiresAt > Date.now()) return cached.status;

		const inFlight = this.metaStatusInFlight.get(key);
		if (inFlight) return await inFlight;

		const read = this.readMetaStatus({ accessToken, phoneNumberId, businessAccountId, appSecret })
			.then((status) => {
				// A failed read is not kept, so the next ask tries Meta again.
				if (status.state !== 'unknown') {
					this.metaStatusCache.set(key, {
						expiresAt: Date.now() + META_STATUS_CACHE_TTL_MS,
						status,
					});
				}
				return status;
			})
			.finally(() => this.metaStatusInFlight.delete(key));
		this.metaStatusInFlight.set(key, read);
		return await read;
	}

	private async readMetaStatus(credential: {
		accessToken: string;
		phoneNumberId: string;
		businessAccountId: string;
		appSecret: string;
	}): Promise<WhatsAppMetaStatus> {
		const { accessToken, phoneNumberId, businessAccountId, appSecret } = credential;
		const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
		const get = async (path: string, qs: Record<string, string>) =>
			await this.get(path, accessToken, { ...qs, appsecret_proof: proof });

		try {
			const [phone, account] = await Promise.all([
				get(`/${encodeURIComponent(phoneNumberId)}`, {
					fields:
						'status,name_status,new_name_status,messaging_limit_tier,verified_name,display_phone_number',
				}),
				// The business read is optional. A failed request must not discard the phone read.
				get(`/${encodeURIComponent(businessAccountId)}`, {
					fields: 'business_verification_status',
				}).catch(() => undefined),
			]);
			if (phone.statusCode !== 200) return { state: 'unknown' };

			return {
				state: resolveWhatsAppMetaState({
					numberStatus: stringProperty(phone.body, 'status'),
					nameStatus: stringProperty(phone.body, 'name_status'),
					newNameStatus: stringProperty(phone.body, 'new_name_status'),
					messagingLimitTier: stringProperty(phone.body, 'messaging_limit_tier'),
					// Without the business read, the number states still show.
					businessVerificationStatus:
						account?.statusCode === 200
							? stringProperty(account.body, 'business_verification_status')
							: undefined,
				}),
				displayName: stringProperty(phone.body, 'verified_name'),
				displayPhoneNumber: stringProperty(phone.body, 'display_phone_number'),
			};
		} catch (error) {
			this.logger.debug('[WhatsAppCredentialCheck] Could not read the Meta status', {
				error: sanitizeErrorDetail(ensureError(error).message, MAX_LOGGED_ERROR_LENGTH),
			});
			return { state: 'unknown' };
		}
	}

	/**
	 * When the token expires, in epoch milliseconds, or `undefined` when it never
	 * does or Meta does not say. Best effort: a token that cannot inspect itself
	 * still passes, because the other requests already prove it works.
	 */
	private async tokenExpiry(accessToken: string, proof: string): Promise<number | undefined> {
		try {
			const response = await this.get('/debug_token', accessToken, {
				input_token: accessToken,
				appsecret_proof: proof,
			});
			const data = isRecord(response.body) ? response.body.data : undefined;
			const expiresAt = numberProperty(data, 'expires_at');
			// Meta reports 0 for a token that never expires.
			return expiresAt ? expiresAt * 1000 : undefined;
		} catch {
			return undefined;
		}
	}

	private refused(target: string, response: GraphResponse): WhatsAppCredentialCheck {
		// Meta's own outage is not evidence that the credential is wrong.
		if (response.statusCode >= 500) return { status: 'failed', reason: 'unreachable' };
		const error = isRecord(response.body) ? response.body.error : undefined;
		this.logger.debug(`[WhatsAppCredentialCheck] Meta refused the ${target} request`, {
			statusCode: response.statusCode,
			code: numberProperty(error, 'code'),
		});
		return { status: 'failed', reason: 'mismatch' };
	}

	private async get(
		path: string,
		accessToken: string,
		qs: Record<string, string>,
	): Promise<GraphResponse> {
		// Throws only when Meta gives no answer. A refusal comes back as a status.
		return await this.outboundHttp
			// Fixed public vendor host, not user-controllable.
			.requests({ useDefaultSsrfPolicy: 'unsafe' })
			.request({
				method: 'GET',
				url: `${GRAPH_API_BASE_URL}${path}`,
				qs,
				headers: { Authorization: `Bearer ${accessToken}` },
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
				timeout: CHECK_TIMEOUT_MS,
			});
	}
}

function listedIds(body: unknown): string[] {
	const data = isRecord(body) && Array.isArray(body.data) ? body.data : [];
	return data
		.map((entry: unknown) => stringProperty(entry, 'id'))
		.filter((id): id is string => id !== undefined);
}

function toProfile(phone: unknown, profileBody: unknown): WhatsAppBusinessProfile {
	// Meta wraps the business profile in a one-item `data` array.
	const profile =
		isRecord(profileBody) && Array.isArray(profileBody.data) ? profileBody.data[0] : undefined;
	return {
		verifiedName: stringProperty(phone, 'verified_name'),
		displayPhoneNumber: stringProperty(phone, 'display_phone_number'),
		// `description` is the longer text on the profile. `about` is the short
		// status line, which many businesses fill in instead.
		description: stringProperty(profile, 'description') ?? stringProperty(profile, 'about'),
		profilePictureUrl: stringProperty(profile, 'profile_picture_url'),
	};
}
