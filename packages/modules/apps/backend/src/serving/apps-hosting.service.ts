import { Logger } from '@n8n/backend-common';
import { classifyRestError, serializePublicApiError } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Router, type RequestHandler } from 'express';
import type { IncomingMessage } from 'node:http';

import { AppHostService } from './app-host.service';

function isServiceWorkerScriptRequest(req: IncomingMessage): boolean {
	const { headers } = req;
	return (
		String(headers['service-worker']).toLowerCase() === 'script' ||
		String(headers['sec-fetch-dest']).toLowerCase() === 'serviceworker'
	);
}

@Service()
export class AppsHostingService {
	readonly router: Router = Router();

	constructor(
		readonly hosts: AppHostService,
		private readonly logger: Logger,
	) {}

	readonly dispatch: RequestHandler = (req, res, next) => {
		if (!this.hosts.ownsRequest(req)) {
			next();
			return;
		}
		res.set({
			'Cache-Control': 'no-store',
			'Content-Security-Policy': this.hosts.contentSecurityPolicy(req),
		});
		if (isServiceWorkerScriptRequest(req)) {
			res.sendStatus(404);
			return;
		}
		if (!this.hosts.namespace(req) && !this.hosts.previewNamespace(req)) {
			res.sendStatus(404);
			return;
		}
		void this.router(req, res, (error?: unknown) => {
			if (!error) {
				if (!res.headersSent) res.sendStatus(404);
				return;
			}
			this.logger.debug('App request failed.', { error });
			if (res.headersSent) {
				res.destroy();
				return;
			}
			if (error instanceof URIError) {
				res.sendStatus(400);
				return;
			}
			const response = serializePublicApiError(classifyRestError(ensureError(error)));
			res.set('Cache-Control', 'no-store').status(response.status).json(response.body);
		});
	};

	allowsUpgrade(req: IncomingMessage): boolean {
		return this.hosts.validRequestHost(req) && !this.hosts.ownsRequest(req);
	}
}
