import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { createIpRateLimit, Delete, Get, Patch, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { UrlService } from '@/services/url.service';

import { AppRuntimeError } from './app-runtime.error';
import { AppTableRuntimeService } from './app-table-runtime.service';
import { applyCors } from './cors';

const MAX_BODY_BYTES = 1024 * 1024;

const rateLimit = createIpRateLimit(
	Container.get(GlobalConfig).apps.runtimeRateLimit,
	Time.minutes.toMilliseconds,
);

type TableRequest = Request<{ namespace: string; key: string }>;

/**
 * Rows of the data tables bound to a served app: `/apps/<namespace>/api/tables/<key>/rows`.
 * Same envelope as the workflow route: `skipAuth` because the caller is the served page,
 * which has no session; the CORS check; the IP rate limit; one stable code per failure.
 */
@RootLevelController('/apps')
export class AppTableRuntimeController {
	constructor(
		private readonly appTableRuntimeService: AppTableRuntimeService,
		private readonly errorReporter: ErrorReporter,
		private readonly urlService: UrlService,
	) {}

	@Get('/:namespace/api/tables/:key/rows', { skipAuth: true, ipRateLimit: rateLimit })
	async listRows(req: TableRequest, res: Response) {
		await this.answer(req, res, 200, async () => {
			const { namespace, key } = req.params;
			return await this.appTableRuntimeService.listRows(namespace, key, req.query);
		});
	}

	@Post('/:namespace/api/tables/:key/rows', { skipAuth: true, ipRateLimit: rateLimit })
	async insertRows(req: TableRequest, res: Response) {
		await this.answer(req, res, 201, async () => {
			const { namespace, key } = req.params;
			return await this.appTableRuntimeService.insertRows(namespace, key, req.body);
		});
	}

	@Patch('/:namespace/api/tables/:key/rows', { skipAuth: true, ipRateLimit: rateLimit })
	async updateRows(req: TableRequest, res: Response) {
		await this.answer(req, res, 200, async () => {
			const { namespace, key } = req.params;
			return await this.appTableRuntimeService.updateRows(namespace, key, req.body);
		});
	}

	@Delete('/:namespace/api/tables/:key/rows', { skipAuth: true, ipRateLimit: rateLimit })
	async deleteRows(req: TableRequest, res: Response) {
		await this.answer(req, res, 200, async () => {
			const { namespace, key } = req.params;
			return await this.appTableRuntimeService.deleteRows(namespace, key, req.query);
		});
	}

	private async answer(
		req: Request,
		res: Response,
		successStatus: number,
		call: () => Promise<unknown>,
	) {
		if (!applyCors(req, res, this.urlService.getInstanceBaseUrl())) return;

		// `rawBody` is unset when the body parser skipped the request (multipart, no body).
		if ((req.rawBody?.length ?? 0) > MAX_BODY_BYTES) {
			res.status(413).json({
				code: 'payload_too_large',
				message: `The request body must be at most ${MAX_BODY_BYTES} bytes.`,
			});
			return;
		}

		try {
			res.status(successStatus).json(await call());
		} catch (error) {
			if (error instanceof AppRuntimeError) {
				const { status, code, message, issues } = error;
				res.status(status).json({ code, message, ...(issues !== undefined ? { issues } : {}) });
				return;
			}
			// Anything else is ours, not the caller's; the browser gets one stable code for it.
			this.errorReporter.error(error);
			res.status(500).json({ code: 'execution_failed', message: 'The data table call failed.' });
		}
	}
}
