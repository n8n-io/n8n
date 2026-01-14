import { CorsService } from '@/services/cors-service';
import type { CorsOptions, Method } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';
import { DynamicCredentialsConfig } from '../dynamic-credentials.config';

@Service()
export class DynamicCredentialCorsService {
	private readonly defaultOptions: Partial<CorsOptions> | null;
	constructor(
		private readonly corsService: CorsService,
		private readonly dynamicCredentialConfig: DynamicCredentialsConfig,
	) {
		if (this.dynamicCredentialConfig.corsOrigin === null) {
			this.defaultOptions = null;
			return;
		}

		const corsOriginConfig = this.dynamicCredentialConfig.corsOrigin?.trim();

		if (!corsOriginConfig) {
			this.defaultOptions = null;
			return;
		}

		const allowedOrigins = corsOriginConfig
			.split(',')
			.map((origin) => origin.trim())
			.filter((origin) => origin.length > 0);

		// Add this check:
		if (allowedOrigins.length === 0) {
			this.defaultOptions = null;
			return;
		}

		if (this.dynamicCredentialConfig.corsAllowCredentials && allowedOrigins.includes('*')) {
			throw new Error(
				'N8N_DYNAMIC_CREDENTIALS_CORS_ORIGIN cannot use wildcard (*) when ' +
					'N8N_DYNAMIC_CREDENTIALS_CORS_ALLOW_CREDENTIALS is true. Specify explicit origins instead.',
			);
		}

		this.defaultOptions = {
			allowedOrigins,
			allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
			allowCredentials: this.dynamicCredentialConfig.corsAllowCredentials,
		};
	}

	preflightHandler(req: Request, res: Response, allowedMethods: Method[]): void {
		if (this.applyCorsHeadersIfEnabled(req, res, allowedMethods)) {
			res.status(204).end();
			return;
		}
		res.status(404).end();
	}

	applyCorsHeadersIfEnabled(req: Request, res: Response, allowedMethods: Method[]): boolean {
		if (this.defaultOptions !== null) {
			return this.corsService.applyCorsHeaders(req, res, {
				...this.defaultOptions,
				allowedMethods,
			});
		}
		return false;
	}
}
