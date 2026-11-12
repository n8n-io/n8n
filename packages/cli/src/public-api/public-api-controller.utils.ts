import type { Request } from 'express';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

import { BadRequestError } from '@n8n/errors';
import { formatValidationError } from '@/public-api/public-api-validation-error';
import { toOpenApiPathTemplate } from '@/public-api/public-api-route-resolver';
import type { PublicApiResult } from '@/public-api/types';

export function parsePathParam(
	key: string,
	schema: ZodTypeAny,
	params: Request['params'],
): unknown {
	const output = z.object({ [key]: schema }).safeParse(params);

	if (!output.success) {
		throw new BadRequestError(formatValidationError('params', output.error));
	}

	return output.data[key];
}

/**
 * Whether an Express route template (`/widgets/:widgetId`) matches a request path. A `:param`
 * segment matches any single segment. Any other segment must be equal.
 */
export function matchesPathTemplate(template: string, path: string): boolean {
	const templateSegments = template.split('/');
	const pathSegments = (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path).split(
		'/',
	);
	return (
		templateSegments.length === pathSegments.length &&
		templateSegments.every(
			(segment, i) =>
				segment.startsWith(':') || segment.toLowerCase() === pathSegments[i].toLowerCase(),
		)
	);
}

// Match the legacy version-less route. req.path drops the prefix, req.baseUrl adds /api/v1
export function toRequestPath(prefix: string, req: Request): string {
	const path = (prefix === '/' ? '' : prefix) + req.path;
	return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

// Leaves out the version prefix. The name then matches the path that the controller declares.
export function toRouteName(method: string, prefix: string, routeTemplate: string): string {
	const path = (prefix === '/' ? '' : prefix) + routeTemplate;
	const trimmedPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
	return `${method.toUpperCase()} ${toOpenApiPathTemplate(trimmedPath)}`;
}

export function toEndpointPath(apiVersion: string, prefix: string, routeTemplate: string): string {
	const path = `/${apiVersion}${prefix === '/' ? '' : prefix}${routeTemplate}`;
	return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function toPublicApiResult(statusCode: number): PublicApiResult {
	if (statusCode >= 500) {
		return '5xx';
	}
	if (statusCode >= 400) {
		return '4xx';
	}
	return '2xx';
}
