import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

const failureReason = z
	.enum([
		'invalid_signature',
		'unknown_key',
		'token_replay',
		'token_too_long',
		'token_near_expiry',
		'invalid_format',
		'missing_kid',
		'missing_iss',
		'invalid_claims',
		'internal_error',
		'role_not_allowed',
		'email_not_verified',
		'other',
	])
	.describe('Why the external token was refused, the same value the audit event records');

const resolution = {
	user_id: z.string().describe('The n8n user the external token resolved to'),
	jit_provisioned: z.boolean().describe('True when this request created the n8n user just in time'),
	identity_linked: z
		.boolean()
		.describe(
			'True when this request linked the external identity to an existing n8n user by email for the first time',
		),
};

export const TOKEN_EXCHANGE_TELEMETRY = defineTelemetryEvents({
	TOKEN_EXCHANGE_SUCCEEDED: {
		name: 'Token exchange succeeded',
		description:
			'An embedding partner exchanged an external token for an n8n access token at the token exchange endpoint. The instance reports it after the n8n token is issued, with how the subject was matched to an n8n user. Tokens and partner secrets are never reported.',
		properties: z.object(resolution),
	},
	TOKEN_EXCHANGE_FAILED: {
		name: 'Token exchange failed',
		description:
			'An embedding partner asked the token exchange endpoint for an n8n access token and was refused. The instance reports the reason only; the external token is never reported.',
		properties: z.object({ reason: failureReason }),
	},
	EMBED_LOGIN_SUCCEEDED: {
		name: 'Embed login succeeded',
		description:
			'An embedding partner signed a user in to the embedded editor with an external token, and the instance issued a browser session. Reported with how the user was matched to an n8n user. The token is never reported.',
		properties: z.object(resolution),
	},
	EMBED_LOGIN_FAILED: {
		name: 'Embed login failed',
		description:
			'An embedding partner tried to sign a user in to the embedded editor with an external token and the instance refused it. The instance reports the reason only.',
		properties: z.object({ reason: failureReason }),
	},
});
