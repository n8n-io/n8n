import type {
	WhatsAppBusinessProfile,
	WhatsAppCredentialCheck,
	WhatsAppMetaStatus,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { UrlService } from '@n8n/backend-services';
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
import {
	isNumberNotFoundError,
	isPermissionError,
	resolveWhatsAppMetaState,
} from './whatsapp-meta-status';

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

/** The channel reads the account and sends messages, so the token needs both. */
const REQUIRED_SCOPES = ['whatsapp_business_management', 'whatsapp_business_messaging'];

interface TokenInfo {
	expiresAt?: number;
	appId?: string;
	systemUserId?: string;
	/** Absent when Meta does not list them. */
	scopes?: string[];
}

/**
 * How the business account answered a token that may not manage it.
 * `notLoadable` is ambiguous: Meta gives it for a wrong ID and for missing access.
 */
type AccountAccess = 'allowed' | 'denied' | 'notLoadable';

/**
 * Whether the app of a credential holds this agent's callback URL. `unknown`
 * means Meta did not answer.
 */
export type WhatsAppCallbackUrlMatch = 'match' | 'mismatch' | 'unknown';

interface GraphResponse {
	statusCode: number;
	body: unknown;
}

/** Bounds the walk over a business's system users. */
const MAX_SYSTEM_USER_PAGES = 20;

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
		private readonly urlService: UrlService,
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
			// First, because Meta refuses an Employee token's other requests. Those
			// refusals would otherwise read as a wrong ID or secret.
			const token = await this.inspectToken(accessToken, proof);
			const role = await this.lookUpSystemUserRole(token.systemUserId, accessToken, proof);
			if (role === 'EMPLOYEE') return { status: 'failed', reason: 'employeeSystemUser' };
			if (token.scopes && REQUIRED_SCOPES.some((scope) => !token.scopes?.includes(scope))) {
				return { status: 'failed', reason: 'missingPermissions' };
			}
			// Meta did not give the role. The token can still lack access, which
			// the account itself shows.
			const access: AccountAccess =
				role === undefined && token.systemUserId
					? await this.probeAccountAccess(businessAccountId, accessToken, proof)
					: 'allowed';
			if (access === 'denied') return { status: 'failed', reason: 'insufficientAccess' };

			const phone = await get(`/${encodeURIComponent(phoneNumberId)}`, {
				fields: 'display_phone_number,verified_name',
			});
			if (phone.statusCode !== 200) {
				// Neither the number nor the account loads, so the token cannot see
				// this business's assets.
				if (access === 'notLoadable' && phone.statusCode < 500) {
					return { status: 'failed', reason: 'insufficientAccess' };
				}
				return this.refused('phone number', phone);
			}
			// When only the account does not load, its ID is wrong. The account read
			// below reports that as a mismatch.

			const [accountNumbers, profile] = await Promise.all([
				get(`/${encodeURIComponent(businessAccountId)}/phone_numbers`, {
					fields: 'id',
					limit: '100',
				}),
				get(`/${encodeURIComponent(phoneNumberId)}/whatsapp_business_profile`, {
					fields: 'about,description,profile_picture_url',
				}).catch(() => undefined),
			]);

			if (
				token.expiresAt !== undefined &&
				token.expiresAt - Date.now() < TEMPORARY_TOKEN_WINDOW_MS &&
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
			// A deleted number gives an error, not a 200 with a status. So does a number
			// this token cannot see. Meta does not say which error, so both kinds count.
			if (isNumberNotFoundError(phone.body) || isPermissionError(phone.body)) {
				return { state: 'numberNotFound' };
			}
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
	 * What Meta says about the token. Best effort: a token that cannot inspect
	 * itself still passes, because the other requests already prove it works.
	 */
	private async inspectToken(accessToken: string, proof: string): Promise<TokenInfo> {
		try {
			const response = await this.get('/debug_token', accessToken, {
				input_token: accessToken,
				appsecret_proof: proof,
			});
			const data = isRecord(response.body) ? response.body.data : undefined;
			this.logger.debug('[WhatsAppCredentialCheck] Inspected the token', {
				statusCode: response.statusCode,
				type: stringProperty(data, 'type'),
				hasUserId: stringProperty(data, 'user_id') !== undefined,
				scopes: isRecord(data) && Array.isArray(data.scopes) ? data.scopes : undefined,
				granularScopes:
					isRecord(data) && Array.isArray(data.granular_scopes) ? data.granular_scopes : undefined,
				...this.errorDetail(response),
			});
			const expiresAt = numberProperty(data, 'expires_at');
			const scopes =
				isRecord(data) && Array.isArray(data.scopes)
					? data.scopes.filter((scope): scope is string => typeof scope === 'string')
					: undefined;
			return {
				// An empty list says nothing about the token, so it is treated as absent.
				scopes: scopes?.length ? scopes : undefined,
				// Meta reports 0 for a token that never expires.
				expiresAt: expiresAt ? expiresAt * 1000 : undefined,
				appId: stringProperty(data, 'app_id'),
				// Only a system user token names its user here.
				systemUserId:
					stringProperty(data, 'type') === 'SYSTEM_USER'
						? stringProperty(data, 'user_id')
						: undefined,
			};
		} catch {
			return {};
		}
	}

	/**
	 * The role of the system user that owns the token, or `undefined` when Meta
	 * does not say. An Employee system user cannot manage the app's WhatsApp
	 * assets, so its token works for a moment and then fails. Best effort, like
	 * {@link inspectToken}.
	 */
	private async lookUpSystemUserRole(
		systemUserId: string | undefined,
		accessToken: string,
		proof: string,
	): Promise<string | undefined> {
		if (!systemUserId) return undefined;
		try {
			// `role` is not readable on the user itself. Meta lists it on the
			// business's system users, so find the business first.
			const businesses = await this.get(
				`/${encodeURIComponent(systemUserId)}/businesses`,
				accessToken,
				{ fields: 'id', appsecret_proof: proof },
			);
			this.logger.debug('[WhatsAppCredentialCheck] Looked up the system user business', {
				statusCode: businesses.statusCode,
				count: listedIds(businesses.body).length,
				...this.errorDetail(businesses),
			});
			for (const businessId of listedIds(businesses.body)) {
				let after: string | undefined;
				for (let page = 0; page < MAX_SYSTEM_USER_PAGES; page++) {
					const users = await this.get(
						`/${encodeURIComponent(businessId)}/system_users`,
						accessToken,
						{
							fields: 'id,role',
							limit: '100',
							...(after ? { after } : {}),
							appsecret_proof: proof,
						},
					);
					this.logger.debug('[WhatsAppCredentialCheck] Looked up the system user role', {
						statusCode: users.statusCode,
						...this.errorDetail(users),
					});
					if (
						users.statusCode !== 200 ||
						!isRecord(users.body) ||
						!Array.isArray(users.body.data)
					) {
						break;
					}
					const self = users.body.data.find(
						(entry: unknown) => stringProperty(entry, 'id') === systemUserId,
					);
					if (self) return stringProperty(self, 'role');
					// Meta gives the cursor of the next page only when there is one.
					const paging = users.body.paging;
					const cursors = isRecord(paging) ? paging.cursors : undefined;
					after = isRecord(paging) && paging.next ? stringProperty(cursors, 'after') : undefined;
					if (!after) break;
				}
			}
			return undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Reads the apps subscribed to the business account, which needs the right to
	 * manage it. Only a permission refusal counts. An expired token, an outage or
	 * no answer does not show that the token lacks access, so those pass.
	 */
	private async probeAccountAccess(
		businessAccountId: string,
		accessToken: string,
		proof: string,
	): Promise<AccountAccess> {
		try {
			const response = await this.get(
				`/${encodeURIComponent(businessAccountId)}/subscribed_apps`,
				accessToken,
				{ appsecret_proof: proof },
			);
			if (response.statusCode === 200) return 'allowed';
			this.logger.debug('[WhatsAppCredentialCheck] Probed the business account access', {
				statusCode: response.statusCode,
				...this.errorDetail(response),
			});
			// 190, a bad token, is not a permission error.
			if (isPermissionError(response.body)) return 'denied';
			// Meta cannot load the object for this token. An Employee system user
			// and a wrong ID both get this, so the caller decides which it is.
			if (isNumberNotFoundError(response.body)) return 'notLoadable';
			return 'allowed';
		} catch {
			return 'allowed';
		}
	}

	/**
	 * Whether the credential's app holds this agent's callback URL. The handshake
	 * does not name the app that sent it, so a callback URL pasted into another
	 * app also completes it. When the app holds no WhatsApp callback URL, the
	 * result is `mismatch`: Meta saves the URL only after the handshake, so the
	 * caller must allow for that delay. When Meta does not answer, the result is
	 * `unknown`.
	 */
	async matchCallbackUrl(
		user: User,
		projectId: string,
		credentialId: string,
		agentId: string,
	): Promise<WhatsAppCallbackUrlMatch> {
		try {
			const data = await this.credentialLookup.decryptForUser(
				user,
				projectId,
				credentialId,
				WHATSAPP_CREDENTIAL_TYPE,
			);
			const accessToken = stringProperty(data, 'accessToken')?.trim();
			const appSecret = stringProperty(data, 'appSecret')?.trim();
			if (!accessToken || !appSecret) return 'unknown';

			const proof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
			const { appId } = await this.inspectToken(accessToken, proof);
			if (!appId) return 'unknown';

			// An app access token, because the subscriptions belong to the app and not to a user.
			const response = await this.get(
				`/${encodeURIComponent(appId)}/subscriptions`,
				`${appId}|${appSecret}`,
				{},
			);
			if (response.statusCode !== 200) return 'unknown';

			const subscriptions =
				isRecord(response.body) && Array.isArray(response.body.data) ? response.body.data : [];
			const callbackUrl = subscriptions
				.filter((entry: unknown) => stringProperty(entry, 'object') === 'whatsapp_business_account')
				.map((entry: unknown) => stringProperty(entry, 'callback_url'))
				.find((url) => url !== undefined);

			// The whole URL, not only the path: the path is the same on every host,
			// so an earlier host of this instance would otherwise pass.
			const expectedUrl = `${this.urlService.getWebhookBaseUrl()}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/whatsapp`;
			this.logger.debug('[WhatsAppCredentialCheck] Compared the callback URL of the app', {
				appId,
				heldHost: hostOf(callbackUrl),
				expectedHost: hostOf(expectedUrl),
			});
			return callbackUrl?.replace(/\/$/, '') === expectedUrl ? 'match' : 'mismatch';
		} catch {
			return 'unknown';
		}
	}

	private errorDetail(response: GraphResponse) {
		const error = isRecord(response.body) ? response.body.error : undefined;
		const message = stringProperty(error, 'message');
		return {
			code: numberProperty(error, 'code'),
			subcode: numberProperty(error, 'error_subcode'),
			message: message && sanitizeErrorDetail(message, MAX_LOGGED_ERROR_LENGTH),
		};
	}

	private refused(target: string, response: GraphResponse): WhatsAppCredentialCheck {
		// Meta's own outage is not evidence that the credential is wrong.
		if (response.statusCode >= 500) return { status: 'failed', reason: 'unreachable' };
		this.logger.debug(`[WhatsAppCredentialCheck] Meta refused the ${target} request`, {
			statusCode: response.statusCode,
			...this.errorDetail(response),
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

/** For logs only: a malformed URL must not change a result. */
function hostOf(url: string | undefined): string | undefined {
	try {
		return url ? new URL(url).host : undefined;
	} catch {
		return undefined;
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
