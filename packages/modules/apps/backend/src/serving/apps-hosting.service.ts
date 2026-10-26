import { Logger } from '@n8n/backend-common';
import { classifyRestError, serializePublicApiError } from '@n8n/backend-services';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { Router, type ErrorRequestHandler, type RequestHandler } from 'express';
import type { IncomingMessage } from 'node:http';

import { AppHostService } from './app-host.service';
import { AppServingService } from './app-serving.service';
import { AppAuthService } from '../auth/app-auth.service';

@Service()
export class AppsHostingService {
	readonly router: Router = Router();
	private ready = false;

	constructor(
		readonly hosts: AppHostService,
		private readonly logger: Logger,
	) {}

	readonly dispatch: RequestHandler = (req, res, next) => {
		if (!this.hosts.validRequestHost(req)) {
			res.sendStatus(400);
			return;
		}
		if (!this.hosts.ownsRequest(req)) {
			next();
			return;
		}
		res.set('Cache-Control', 'no-store');
		if (!this.hosts.namespace(req)) {
			res.sendStatus(404);
			return;
		}
		if (!this.ready) {
			res.sendStatus(503);
			return;
		}
		void this.router(req, res, () => {
			if (!res.headersSent) res.sendStatus(404);
		});
	};

	allowsUpgrade(req: IncomingMessage): boolean {
		return this.hosts.validRequestHost(req) && !this.hosts.ownsRequest(req);
	}

	get authenticate(): RequestHandler {
		const auth = Container.get(AppAuthService);
		return auth.authenticate.bind(auth);
	}

	/** Call after apps controllers and their parsers are registered. */
	finishSetup() {
		const serving = Container.get(AppServingService);
		this.router.use((req, res, next) => {
			if (serving.isReserved(req)) {
				res.sendStatus(404);
				return;
			}
			next();
		});
		this.router.use(this.authenticate);
		this.router.use(serving.serve.bind(serving));
		const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
			this.logger.debug('App request failed.', { error });
			const response = serializePublicApiError(classifyRestError(ensureError(error)));
			if (res.headersSent) {
				res.destroy();
				return;
			}
			res.set('Cache-Control', 'no-store').status(response.status).json(response.body);
		};
		this.router.use(onError);
		this.ready = true;
	}
}
