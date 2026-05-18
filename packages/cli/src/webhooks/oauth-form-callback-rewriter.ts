import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { RequestHandler, Response } from 'express';
import {
	FORM_OAUTH_PRODUCTION_CALLBACK_PATH,
	FORM_OAUTH_TEST_CALLBACK_PATH,
	InstanceSettings,
	getHtmlSandboxCSP,
	isFormHtmlSandboxingDisabled,
	verifyFormOauthJwt,
	type FormOauthStateJwtPayload,
} from 'n8n-core';

/**
 * Express middleware that lets the Form trigger's OAuth callback land on a
 * stable URL (`/rest/oauth2-credential/form-callback` and
 * `/rest/oauth2-credential/test-form-callback`) instead of the form's own URL.
 * Builders can register just these two URLs with their IDP.
 *
 * On a callback request the middleware verifies the signed state JWT, reads the
 * form's own URL path from the state, and rewrites the request (`req.url`,
 * `req.originalUrl`, `req.params.path`) so the existing form webhook handler
 * runs as if the visitor had landed on the form URL with `?code=&state=`
 * directly. The form handler then picks up `code`/`state` from the query and
 * performs the token exchange via the existing helper.
 *
 * The form URL itself was captured into the state JWT during the initial
 * authorize redirect (see `getWebhookOauthRedirectUrl` in `packages/core`), so
 * the rewriter doesn't need to look anything up in the database.
 *
 * On any non-callback request the middleware is a no-op.
 */
@Service()
export class OauthFormCallbackRewriter {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	get middleware(): RequestHandler {
		return (req, res, next) => {
			try {
				const productionCallback = `/${this.globalConfig.endpoints.rest}${FORM_OAUTH_PRODUCTION_CALLBACK_PATH}`;
				const testCallback = `/${this.globalConfig.endpoints.rest}${FORM_OAUTH_TEST_CALLBACK_PATH}`;

				const isCallback = req.path === productionCallback || req.path === testCallback;
				if (!isCallback) {
					next();
					return;
				}

				const state = typeof req.query.state === 'string' ? req.query.state : undefined;
				if (!state) {
					this.renderError(res, 'Sign-in failed', 'Missing required parameters.');
					return;
				}

				const verified = verifyFormOauthJwt<FormOauthStateJwtPayload>(
					state,
					this.instanceSettings.hmacSignatureSecret,
				);
				if (!verified) {
					this.renderError(
						res,
						'Sign-in expired',
						'Your sign-in session has expired. Please try again.',
					);
					return;
				}

				// Defense in depth: the path was JWT-signed by us so it can't be tampered,
				// but reject anything that's not a valid form URL just in case.
				if (!this.isAllowedFormPath(verified.path)) {
					this.renderError(res, 'Sign-in failed', 'Invalid form path in sign-in state.');
					return;
				}

				// `req.url` is a relative URL (path + query). The URL class requires an
				// absolute URL, so we parse against a dummy base and reassemble.
				const DUMMY_BASE = 'http://localhost';
				const incomingUrl = new URL(req.url, DUMMY_BASE);
				const rewrittenUrl = new URL(verified.path, DUMMY_BASE);
				rewrittenUrl.search = incomingUrl.search;
				const newUrl = `${rewrittenUrl.pathname}${rewrittenUrl.search}`;

				req.url = newUrl;
				Object.defineProperty(req, 'originalUrl', {
					value: newUrl,
					writable: true,
					configurable: true,
				});
				// The downstream form handler reads `req.params.path` (set by Express when
				// the form route matches `*path`). Populate it from the state-stored path
				// since the original route match was against the callback URL.
				const formPathSegment = rewrittenUrl.pathname.split('/').slice(2).join('/');
				(req.params as Record<string, string>) = { path: formPathSegment };

				next();
			} catch (error) {
				this.logger.error('Form OAuth callback rewrite failed', { error });
				this.renderError(res, 'Sign-in failed', 'An error occurred while completing sign-in.');
			}
		};
	}

	private isAllowedFormPath(path: string): boolean {
		const formPrefix = `/${this.globalConfig.endpoints.form}/`;
		const testFormPrefix = `/${this.globalConfig.endpoints.formTest}/`;
		return path.startsWith(formPrefix) || path.startsWith(testFormPrefix);
	}

	private renderError(res: Response, title: string, message: string): void {
		if (!isFormHtmlSandboxingDisabled()) {
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		}
		res.status(400).render('form-trigger-auth-error', { title, message });
	}
}
