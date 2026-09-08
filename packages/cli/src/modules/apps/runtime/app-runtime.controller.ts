import { Time } from '@n8n/constants';
import { createIpRateLimit, Options, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { AppsConfig } from '../apps.config';
import { AppRuntimeError } from './app-runtime.error';
import { AppRuntimeService } from './app-runtime.service';

const MAX_BODY_BYTES = 1024 * 1024;

const rateLimit = createIpRateLimit(
	Container.get(AppsConfig).runtimeRateLimit,
	Time.minutes.toMilliseconds,
);

/**
 * The served page runs on an opaque origin (`sandbox` CSP), so every call is
 * cross-origin with `Origin: null`. `*` is safe because no credentials are ever
 * accepted; `Authorization` is allowed so a later visitor token needs no CORS change.
 */
function setCorsHeaders(res: Response) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Runtime API of a served app: `/apps/<namespace>/api/*`. Registered before the
 * serving controller so these paths never fall through to its SPA fallback.
 */
@RootLevelController('/apps')
export class AppRuntimeController {
	constructor(
		private readonly appRuntimeService: AppRuntimeService,
		private readonly errorReporter: ErrorReporter,
	) {}

	@Options('/:namespace/api{/*path}', { skipAuth: true, ipRateLimit: rateLimit })
	preflight(_req: Request, res: Response) {
		setCorsHeaders(res);
		res.status(204).end();
	}

	/** Anonymous by design: the app's bindings are the allow-list (`Authorization` is reserved, ignored in v1). */
	@Post('/:namespace/api/workflows/:key', { skipAuth: true, ipRateLimit: rateLimit })
	async runWorkflow(req: Request<{ namespace: string; key: string }>, res: Response) {
		setCorsHeaders(res);

		if (req.rawBody.length > MAX_BODY_BYTES) {
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
