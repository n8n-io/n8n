import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';

export type PublicAPIHandler<TParams extends Record<string, string>> = (
	req: AuthenticatedRequest<TParams>,
	res: Response,
) => Promise<Response | undefined>;
