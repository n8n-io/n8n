import { Container } from '@n8n/di';
import axios from 'axios';
import { decode } from 'jsonwebtoken';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	WebhookOauthHelperFunctions,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';
import {
	FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
	FORM_OAUTH_STATE_JWT_EXPIRY_SEC,
	generateFormOauthNonce,
	signFormOauthJwt,
	verifyFormOauthJwt,
	type FormOauthSessionJwtPayload,
	type FormOauthStateJwtPayload,
} from '@/utils/form-oauth-jwt';

const OAUTH_LOGIN_CREDENTIAL_TYPE = 'oAuth2Api';

/**
 * Claims dropped from the merged ID-token + userinfo result. These are JWT or
 * OIDC housekeeping fields, not user identity.
 */
const HOUSEKEEPING_CLAIMS = [
	'iat',
	'nbf',
	'exp',
	'iss',
	'aud',
	'at_hash',
	'c_hash',
	'nonce',
	'jti',
	'azp',
	'sid',
];

interface OauthTokenResponse {
	access_token?: string;
	id_token?: string;
	refresh_token?: string;
	token_type?: string;
	expires_in?: number;
}

const pickString = (record: Record<string, unknown>, key: string): string => {
	const value = record[key];
	return typeof value === 'string' ? value : '';
};

/**
 * Compute the public URL of the webhook the current request was made to. This is
 * the form's own URL (`/form/<path>` or `/form-test/<path>`) — the IDP redirects
 * back here, so the OAuth `redirect_uri` parameter must be exactly this string.
 */
function currentWebhookUrl(additionalData: IWorkflowExecuteAdditionalData): string {
	const req = additionalData.httpRequest;
	if (!req) {
		throw new Error('OAuth login helper invoked without a request context');
	}
	const path = (req.originalUrl ?? '').split('?')[0] ?? '';
	const host = typeof req.get === 'function' ? req.get('host') : req.headers?.host;
	const protocol = req.protocol ?? 'http';
	return `${protocol}://${String(host ?? '')}${path}`;
}

async function decryptOauthCredential(
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
): Promise<Record<string, unknown>> {
	const nodeCredentials = node.credentials?.[OAUTH_LOGIN_CREDENTIAL_TYPE];
	if (!nodeCredentials?.id) {
		throw new Error(
			`Node "${node.name}" has no "${OAUTH_LOGIN_CREDENTIAL_TYPE}" credential configured`,
		);
	}
	const mode: WorkflowExecuteMode = 'internal';
	return await additionalData.credentialsHelper.getDecrypted(
		additionalData,
		nodeCredentials,
		OAUTH_LOGIN_CREDENTIAL_TYPE,
		mode,
		undefined,
		false,
	);
}

export function getOauthLoginHelperFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
): WebhookOauthHelperFunctions {
	const signingSecret = () => Container.get(InstanceSettings).hmacSignatureSecret;

	return {
		async getWebhookOauthRedirectUrl({ reauth = false } = {}): Promise<string> {
			const decrypted = await decryptOauthCredential(node, additionalData);

			const clientId = pickString(decrypted, 'clientId');
			const authUrl = pickString(decrypted, 'authUrl');
			const scope = pickString(decrypted, 'scope');
			if (!clientId || !authUrl) {
				throw new Error('OAuth login credential is missing required fields (clientId or authUrl)');
			}

			const stateJwt = signFormOauthJwt<FormOauthStateJwtPayload>(
				{ nonce: generateFormOauthNonce(), wf: workflow.id, node: node.id },
				signingSecret(),
				FORM_OAUTH_STATE_JWT_EXPIRY_SEC,
			);

			const params = new URLSearchParams({
				response_type: 'code',
				client_id: clientId,
				redirect_uri: currentWebhookUrl(additionalData),
				state: stateJwt,
			});
			if (scope) params.set('scope', scope);
			if (reauth) params.set('prompt', 'login');

			const separator = authUrl.includes('?') ? '&' : '?';
			return `${authUrl}${separator}${params.toString()}`;
		},

		async exchangeWebhookOauthCode({ code, state }) {
			const verified = verifyFormOauthJwt<FormOauthStateJwtPayload>(state, signingSecret());
			if (!verified || verified.wf !== workflow.id || verified.node !== node.id) {
				throw new Error('OAuth login state is invalid or does not match this form');
			}

			const decrypted = await decryptOauthCredential(node, additionalData);
			const clientId = pickString(decrypted, 'clientId');
			const clientSecret = pickString(decrypted, 'clientSecret');
			const accessTokenUrl = pickString(decrypted, 'accessTokenUrl');
			if (!clientId || !accessTokenUrl) {
				throw new Error(
					'OAuth login credential is missing required fields (clientId or accessTokenUrl)',
				);
			}

			const redirectUri = currentWebhookUrl(additionalData);

			const tokenResponse = await axios.post<OauthTokenResponse>(
				accessTokenUrl,
				new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					client_id: clientId,
					client_secret: clientSecret,
					redirect_uri: redirectUri,
				}).toString(),
				{
					headers: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Content-Type': 'application/x-www-form-urlencoded',
						// eslint-disable-next-line @typescript-eslint/naming-convention
						Accept: 'application/json',
					},
					validateStatus: (status) => status === 200,
				},
			);

			// With `openid` scope (and `profile` / `email` for the usual fields), every
			// major IDP returns user claims in the id_token. The userinfo endpoint is
			// redundant for our purposes, so we don't call it.
			const { id_token: idToken } = tokenResponse.data;
			let idTokenClaims: Record<string, unknown> = {};
			if (typeof idToken === 'string') {
				const decoded = decode(idToken);
				if (decoded && typeof decoded === 'object') {
					idTokenClaims = decoded as Record<string, unknown>;
				}
			}

			const merged: Record<string, unknown> = { ...idTokenClaims };
			for (const key of HOUSEKEEPING_CLAIMS) delete merged[key];

			const sessionJwt = signFormOauthJwt<FormOauthSessionJwtPayload>(
				{ wf: workflow.id, node: node.id, claims: merged },
				signingSecret(),
				FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
			);

			return { claims: merged, sessionJwt };
		},
	};
}
