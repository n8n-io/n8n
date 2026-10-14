import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { HttpApiV1, HttpRequestV1, HttpRouteV1 } from '@n8n/hooks-api';
import type { Request, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { UnexpectedError } from 'n8n-workflow';

type QueryV1 = HttpRequestV1['query'];

const toQueryV1 = (query: Request['query']): QueryV1 => {
	const result: QueryV1 = {};
	for (const [key, value] of Object.entries(query)) {
		if (typeof value === 'string') result[key] = value;
		else if (Array.isArray(value)) result[key] = value.filter((v) => typeof v === 'string');
	}
	return result;
};

const toParamsV1 = (params: Request['params']): HttpRequestV1['params'] => {
	const result: HttpRequestV1['params'] = {};
	for (const [key, value] of Object.entries(params)) {
		result[key] = Array.isArray(value) ? value.join('/') : value;
	}
	return result;
};

@Service()
export class PublicHttpService implements HttpApiV1 {
	readonly version = 1;

	/**
	 * Mounted before the editor UI fallback routes, so routes that extensions
	 * add later, during `register`, are still reachable.
	 */
	readonly router: ExpressRouter = Router();

	constructor(private readonly logger: Logger) {}

	registerRoute({ method, path, handler }: HttpRouteV1): void {
		if (!path.startsWith('/')) {
			throw new UnexpectedError('Route path must start with "/"', { extra: { path } });
		}

		this.router[method](path, async (req, res) => {
			try {
				const response = await handler({
					method,
					path: req.path,
					params: toParamsV1(req.params),
					query: toQueryV1(req.query),
					headers: req.headers,
					body: req.body,
				});

				res.status(response.status);
				if (response.headers) res.set(response.headers);
				if (response.body === undefined) res.end();
				else res.json(response.body);
			} catch (error) {
				this.logger.error('Extension route failed', { method, path, error });
				res.status(500).json({ message: 'Internal server error' });
			}
		});

		this.logger.debug('Registered extension route', { method, path });
	}
}
