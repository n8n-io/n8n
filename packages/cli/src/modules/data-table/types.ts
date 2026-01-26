import type { AuthenticatedRequest } from '@n8n/db';
import type { RequestHandler } from 'express';

export interface UploadMiddleware {
	single(fieldName: string): RequestHandler;
}

export type MulterDestinationCallback = (error: Error | null, destination: string) => void;
export type MulterFilenameCallback = (error: Error | null, filename: string) => void;

export type AuthenticatedRequestWithFile<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = AuthenticatedRequest<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	file?: Express.Multer.File;
	fileUploadError?: Error;
};

export function hasStringProperty<K extends string>(
	obj: unknown,
	key: K,
): obj is Record<K, string> & object {
	return typeof obj === 'object' && obj !== null && key in obj;
}
