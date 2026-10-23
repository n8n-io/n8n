import type { WhatsAppBusinessProfile, WhatsAppCredentialCheck } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import { sanitizeErrorDetail } from '@n8n/utils/redaction/sanitize-error-detail';
import { createHmac } from 'node:crypto';

import { AgentCredentialLookupService } from '../../agent-credential-lookup.service';
import { numberProperty, stringProperty } from '../../integration-helpers';

const WHATSAPP_CREDENTIAL_TYPE = 'whatsAppBotApi';

/** The version the pinned `@chat-adapter/whatsapp` sends to, so both see the same API. */
const GRAPH_API_BASE_URL = 'https://graph.facebook.com/v25.0';

/**
 * The token on the API Setup page lasts about 24 hours. A permanent system
 * user token never expires, so anything that ends this soon will stop the
 * channel within days of connecting it.
 */
const TEMPORARY_TOKEN_WINDOW_MS = 48 * 60 * 60 * 1000;

/** The check gates a button, so a stalled request has to give up quickly. */
const CHECK_TIMEOUT_MS = 30_000;

const MAX_LOGGED_ERROR_LENGTH = 500;

interface GraphResponse {
	statusCode: number;
	body: unknown;
}

@Service()
export class WhatsAppCredentialCheckService {
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
