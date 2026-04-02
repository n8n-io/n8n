import type { CorsOptions } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Response, Request } from 'express';

@Service()
export class CorsService {
	private readonly defaultOptions: CorsOptions = {
		allowedOrigins: ['*'],
		allowedMethods: ['get', 'post', 'options', 'put', 'patch', 'delete'],
		allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
		maxAge: 86400,
	};

	/**
	 * Apply CORS headers to response based on request origin
	 * @returns true if origin is allowed, false otherwise
	 */
	applyCorsHeaders(req: Request, res: Response, options?: Partial<CorsOptions>): boolean {
		const config = { ...this.defaultOptions, ...options };

		const requestOrigin = req.headers.origin;

		if (!requestOrigin) return false;

		const isAllowed = this.isOriginAllowed(requestOrigin, config.allowedOrigins ?? []);
		if (!isAllowed) return false;

		res.header('Access-Control-Allow-Origin', requestOrigin);

		if (config.allowCredentials !== undefined) {
			res.header('Access-Control-Allow-Credentials', `${config.allowCredentials}`);
		}

		if (config.allowedMethods) {
			res.header('Access-Control-Allow-Methods', config.allowedMethods.join(', ').toUpperCase());
		}

		if (config.allowedHeaders) {
			res.header('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
		}

		if (config.maxAge) {
			res.header('Access-Control-Max-Age', config.maxAge.toString());
		}

		return true;
	}

	private isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
		return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
	}
}
