import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { createIpRateLimit, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { UrlService } from '@/services/url.service';

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
@RootLevelController('/apps')
export class AppRuntimeController {
	constructor(
		private readonly appRuntimeService: AppRuntimeService,
		private readonly errorReporter: ErrorReporter,
		private readonly urlService: UrlService,
	) {}

	private applyCors(req: Request, res: Response): boolean {
		return applyCors(req, res, this.urlService.getInstanceBaseUrl());
	}

	// No rate limit: the browser preflights every call, so a limit here would halve the
	// budget of the POST route.
	@Options('/:namespace/api{/*path}', { skipAuth: true })
	preflight(req: Request, res: Response) {
		if (!this.applyCors(req, res)) return;
		res.status(204).end();
	}

	/** `skipAuth`: the caller is the served page, which has no session; every app is public. */
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
