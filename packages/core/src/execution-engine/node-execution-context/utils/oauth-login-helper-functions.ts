import { GlobalConfig } from '@n8n/config';
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
	FORM_OAUTH_PRODUCTION_CALLBACK_PATH,
	FORM_OAUTH_SESSION_JWT_EXPIRY_SEC,
	FORM_OAUTH_STATE_JWT_EXPIRY_SEC,
	FORM_OAUTH_TEST_CALLBACK_PATH,
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
 * Build the static OAuth `redirect_uri` for the form-login flow. The same path is
 * mounted twice in the Express app: once as a callback URL that gets rewritten to
 * the underlying form URL before the form handler runs. Test vs. production is
 * derived from the current request URL.
 *
 * Builders register these two URLs (one each) at their IDP — instead of every
 * individual form URL.
 */
function buildStaticCallbackUrl(additionalData: IWorkflowExecuteAdditionalData): string {
	const req = additionalData.httpRequest;
	if (!req) {
		throw new Error('OAuth login helper invoked without a request context');
	}
	const host = typeof req.get === 'function' ? req.get('host') : req.headers?.host;
	const protocol = req.protocol ?? 'http';
	const endpoints = Container.get(GlobalConfig).endpoints;

	// Mode detection from the current request URL: form-test prefix => test mode;
	// callback URL itself => check the path for the test-specific callback.
	const originalUrl = req.originalUrl ?? '';
	const isTest =
		originalUrl.startsWith(`/${endpoints.formTest}/`) ||
		originalUrl.startsWith(`/${endpoints.rest}${FORM_OAUTH_TEST_CALLBACK_PATH}`);

	const callbackPath = isTest ? FORM_OAUTH_TEST_CALLBACK_PATH : FORM_OAUTH_PRODUCTION_CALLBACK_PATH;
	return `${protocol}://${String(host ?? '')}/${endpoints.rest}${callbackPath}`;
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
				redirect_uri: buildStaticCallbackUrl(additionalData),
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

			const redirectUri = buildStaticCallbackUrl(additionalData);

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
