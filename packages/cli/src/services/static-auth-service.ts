import { Service } from '@n8n/di';
import { Request, Response, NextFunction } from 'express';

/**
 * Service providing middleware for static authentication via user defined auth token.
 */
@Service()
export class StaticAuthService {
	/**
	 * Provides middleware that checks for a static bearer token in the Authorization header.
	 * @param endpointAuthToken The expected authentication token for the endpoint
	 * @returns Middleware function or null if no token is configured
	 */
	static getStaticAuthMiddleware(endpointAuthToken: string, headerName: string = 'authorization') {
		if (!endpointAuthToken?.trim()) {
			return null;
		}

		const expectedAuthorizationHeaderValue = `Bearer ${endpointAuthToken.trim()}`;

		return (req: Request, res: Response, next: NextFunction) => {
			if (req.headers[headerName] !== expectedAuthorizationHeaderValue) {
				res.status(401).send('Unauthorized');
				return;
			}
			next();
		};
	}
}
