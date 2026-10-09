import type { AppUser } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	createIpRateLimit,
	Get,
	Middleware,
	Options,
	Post,
	RootLevelController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { AppAuthService } from '../app-auth.service';
import { AppHostConfig } from '../app-host.config';
import { APP_SERVING_PATH } from '../app-host.constants';
import { AppRuntimeError } from './app-runtime.error';
import { AppRuntimeService } from './app-runtime.service';
import { applyCors } from './cors';

const MAX_BODY_BYTES = 1024 * 1024;

const rateLimit = createIpRateLimit(
	Container.get(GlobalConfig).apps.runtimeRateLimit,
	Time.minutes.toMilliseconds,
);

/**
 * Runtime API of a served app: `/apps/<namespace>/api/*`. Registered before the
 * serving controller so these paths never fall through to its SPA fallback.
 */
// App OAuth cookies replace the default n8n session check.
@RootLevelController(APP_SERVING_PATH)
export class AppRuntimeController {
	constructor(
		private readonly appRuntimeService: AppRuntimeService,
		private readonly errorReporter: ErrorReporter,
		private readonly config: AppHostConfig,
		private readonly appAuthService: AppAuthService,
	) {}

	@Middleware()
	checkHost(req: Request, res: Response, next: NextFunction) {
		this.appAuthService.checkHost(req, res, next);
	}

	@Middleware()
	async authenticate(req: Request, res: Response, next: NextFunction) {
		await this.appAuthService.authenticate(req, res, next);
	}

	private applyCors(req: Request, res: Response): boolean {
		return applyCors(req, res, this.config.baseUrl);
	}

	// No rate limit: the browser preflights every call, so a limit here would halve the
	// budget of the POST route.
	@Options('/:namespace/api{/*path}', { skipAuth: true })
	preflight(req: Request, res: Response) {
		if (!this.applyCors(req, res)) return;
		res.status(204).end();
	}

	@Get('/:namespace/api/me', { skipAuth: true, ipRateLimit: rateLimit, usesTemplates: true })
	getUser(req: AuthenticatedRequest, res: Response) {
		if (!this.applyCors(req, res)) return;
		const user: AppUser = {
			id: req.user.id,
			firstName: req.user.firstName ?? null,
			lastName: req.user.lastName ?? null,
			email: req.user.email,
		};
		res.json(user);
	}

	@Post('/:namespace/api/workflows/:key', { skipAuth: true, ipRateLimit: rateLimit })
	async runWorkflow(req: Request<{ namespace: string; key: string }>, res: Response) {
		if (!this.applyCors(req, res)) return;

		// `rawBody` is unset when the body parser skipped the request (multipart).
		if ((req.rawBody?.length ?? 0) > MAX_BODY_BYTES) {
			res.status(413).json({
				code: 'payload_too_large',
				message: `The request body must be at most ${MAX_BODY_BYTES} bytes.`,
			});
			return;
		}

		try {
			const result = await this.appRuntimeService.runWorkflow(
				req.params.namespace,
				req.params.key,
				req.body,
			);
			res.status(result.status === 'running' ? 202 : 200).json(result);
		} catch (error) {
			if (error instanceof AppRuntimeError) {
				const { status, code, message, issues } = error;
				res.status(status).json({ code, message, ...(issues !== undefined ? { issues } : {}) });
				return;
			}
			// Anything else is ours, not the caller's; the browser gets one stable code for it.
			this.errorReporter.error(error);
			res.status(500).json({ code: 'execution_failed', message: 'The workflow could not be run.' });
		}
	}
}
