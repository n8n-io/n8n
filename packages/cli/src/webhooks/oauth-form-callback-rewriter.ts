import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
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
import type { INode } from 'n8n-workflow';

/**
 * Express middleware that lets the Form trigger's OAuth callback land on a
 * stable URL (`/rest/oauth2-credential/form-callback` and
 * `/rest/oauth2-credential/test-form-callback`) instead of the form's own URL.
 * Builders can register just these two URLs with their IDP.
 *
 * On a callback request the middleware verifies the signed state JWT, locates
 * the workflow + node, derives the form's own URL from its config, and rewrites
 * the request (`req.url`, `req.originalUrl`, `req.params.path`) so the existing
 * form webhook handler runs as if the visitor had landed on the form URL with
 * `?code=&state=` directly. The form handler picks up `code`/`state` from the
 * query and performs the token exchange via the existing helper.
 *
 * On any non-callback request the middleware is a no-op.
 */
@Service()
export class OauthFormCallbackRewriter {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
	) {}

	get middleware(): RequestHandler {
		return async (req, res, next) => {
			try {
				const productionCallback = `/${this.globalConfig.endpoints.rest}${FORM_OAUTH_PRODUCTION_CALLBACK_PATH}`;
				const testCallback = `/${this.globalConfig.endpoints.rest}${FORM_OAUTH_TEST_CALLBACK_PATH}`;

				const isProduction = req.path === productionCallback;
				const isTest = req.path === testCallback;

				if (!isProduction && !isTest) {
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

				const workflow = await this.workflowRepository.findOneBy({ id: verified.wf });
				if (!workflow) {
					this.renderError(res, 'Sign-in failed', 'Form is no longer available.');
					return;
				}

				const node = (workflow.nodes as INode[]).find((n) => n.id === verified.node);
				if (!node) {
					this.renderError(res, 'Sign-in failed', 'Form node not found.');
					return;
				}

				const formPath = this.getFormPath(node);
				if (!formPath) {
					this.renderError(res, 'Sign-in failed', 'Form path is not configured.');
					return;
				}

				const formPrefix = isTest
					? this.globalConfig.endpoints.formTest
					: this.globalConfig.endpoints.form;
				const newPathOnly = `/${formPrefix}/${formPath}`;
				const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
				const newUrl = `${newPathOnly}${queryString}`;

				req.url = newUrl;
				Object.defineProperty(req, 'originalUrl', {
					value: newUrl,
					writable: true,
					configurable: true,
				});
				(req.params as Record<string, string>) = { path: formPath };

				next();
			} catch (error) {
				this.logger.error('Form OAuth callback rewrite failed', { error });
				this.renderError(res, 'Sign-in failed', 'An error occurred while completing sign-in.');
			}
		};
	}

	private getFormPath(node: INode): string {
		const explicitPath =
			(node.parameters?.path as string | undefined) ??
			(node.parameters?.options as { path?: string } | undefined)?.path;
		if (typeof explicitPath === 'string' && explicitPath !== '') return explicitPath;
		return node.webhookId ?? '';
	}

	private renderError(res: Response, title: string, message: string): void {
		if (!isFormHtmlSandboxingDisabled()) {
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		}
		res.status(400).render('form-trigger-auth-error', { title, message });
	}
}
