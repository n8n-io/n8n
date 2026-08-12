import type { IHttpRequestMethods } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { endpointLabel, normalizePath } from './router';
import type { ApiRouterEndpoint } from './types';

/**
 * Minimal structural types for the slice of OpenAPI this node reads and writes.
 * `openapi-types` is not a declared dependency of this package.
 */
export type JsonSchema = Record<string, unknown>;

export type OpenApiOperation = {
	operationId?: string;
	summary?: string;
	description?: string;
	parameters?: Array<{ name: string; in: string; required?: boolean; schema?: JsonSchema }>;
	requestBody?: {
		required?: boolean;
		content?: Record<string, { schema?: JsonSchema }>;
	};
	responses?: Record<string, { description: string; content?: Record<string, unknown> }>;
};

export type OpenApiDocument = {
	openapi: string;
	info: { title: string; version: string };
	servers?: Array<{ url: string }>;
	paths: Record<string, Record<string, OpenApiOperation>>;
};

const IMPORTABLE_METHODS: IHttpRequestMethods[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** `/orders/{orderId}` → `/orders/:orderId`, the form the router matches on. */
export function templateToRoutePath(path: string): string {
	return `/${normalizePath(path.replace(/\{([^}/]+)\}/g, ':$1')).join('/')}`;
}

/** `/orders/:orderId` → `/orders/{orderId}`, the form OpenAPI declares. */
export function routePathToTemplate(path: string): string {
	return `/${normalizePath(path)
		.map((segment) => (segment.startsWith(':') ? `{${segment.slice(1)}}` : segment))
		.join('/')}`;
}

export function importSpec(spec: unknown): {
	endpoints: ApiRouterEndpoint[];
	warnings: string[];
} {
	const document = parseSpec(spec);
	const warnings: string[] = [];

	const version = document.openapi;
	if (typeof version !== 'string' || !version.startsWith('3.')) {
		warnings.push(
			`Expected an OpenAPI 3.x document but found version "${String(version ?? 'unknown')}". Importing anyway.`,
		);
	}

	const paths = isRecord(document.paths) ? document.paths : undefined;
	if (paths === undefined) {
		throw new UserError('The OpenAPI document has no "paths" object');
	}

	const endpoints: ApiRouterEndpoint[] = [];

	for (const [templatePath, pathItem] of Object.entries(paths)) {
		if (!isRecord(pathItem)) continue;

		const path = templateToRoutePath(templatePath);

		for (const [rawMethod, operation] of Object.entries(pathItem)) {
			const method = rawMethod.toUpperCase();
			if (!IMPORTABLE_METHODS.includes(method as IHttpRequestMethods)) continue;
			if (!isRecord(operation)) continue;

			const { schema, warning } = requestSchemaOf(operation, method, path);
			if (warning !== undefined) warnings.push(warning);

			endpoints.push({
				name: operationName(operation),
				method: method as IHttpRequestMethods,
				path,
				authentication: 'inherit',
				responseMode: 'inherit',
				...(schema === undefined ? {} : { requestSchema: JSON.stringify(schema, null, 2) }),
			});
		}
	}

	if (endpoints.length === 0) {
		warnings.push('No importable operations were found in the document');
	}

	return { endpoints, warnings };
}

function parseSpec(spec: unknown): Record<string, unknown> {
	if (typeof spec === 'string') {
		try {
			const parsed: unknown = JSON.parse(spec);
			if (!isRecord(parsed)) throw new Error('not an object');
			return parsed;
		} catch {
			throw new UserError('The OpenAPI document could not be parsed as JSON', {
				description: 'YAML documents are not supported. Convert the spec to JSON first.',
			});
		}
	}

	if (!isRecord(spec)) {
		throw new UserError('The OpenAPI document must be a JSON object');
	}

	return spec;
}

function operationName(operation: Record<string, unknown>): string | undefined {
	const { operationId, summary } = operation;
	if (typeof operationId === 'string' && operationId.length > 0) return operationId;
	if (typeof summary === 'string' && summary.length > 0) return summary;
	return undefined;
}

function requestSchemaOf(
	operation: Record<string, unknown>,
	method: string,
	path: string,
): { schema?: JsonSchema; warning?: string } {
	const requestBody = operation.requestBody;
	if (!isRecord(requestBody)) return {};

	if (typeof requestBody.$ref === 'string') {
		return {
			warning: `${method} ${path}: a $ref request body was skipped; references are not resolved`,
		};
	}

	const content = requestBody.content;
	if (!isRecord(content)) return {};

	const jsonContent = content['application/json'];
	if (!isRecord(jsonContent)) {
		const [type] = Object.keys(content);
		return {
			warning:
				type === undefined
					? undefined
					: `${method} ${path}: request body of type "${type}" was skipped; only application/json schemas are imported`,
		};
	}

	const schema = jsonContent.schema;
	if (!isRecord(schema)) return {};
	if (typeof schema.$ref === 'string') {
		return { warning: `${method} ${path}: a $ref schema was skipped; references are not resolved` };
	}

	return { schema };
}

export function exportSpec(params: {
	endpoints: ApiRouterEndpoint[];
	title?: string;
	version?: string;
	serverUrl?: string;
}): OpenApiDocument {
	const paths: OpenApiDocument['paths'] = {};

	for (const endpoint of params.endpoints) {
		const template = routePathToTemplate(endpoint.path);
		const operations = (paths[template] ??= {});
		operations[endpoint.method.toLowerCase()] = buildOperation(endpoint);
	}

	return {
		openapi: '3.1.0',
		info: {
			title: params.title?.trim() || 'n8n API Router',
			version: params.version?.trim() || '1.0.0',
		},
		...(params.serverUrl === undefined ? {} : { servers: [{ url: params.serverUrl }] }),
		paths,
	};
}

function buildOperation(endpoint: ApiRouterEndpoint): OpenApiOperation {
	const parameters = normalizePath(endpoint.path)
		.filter((segment) => segment.startsWith(':'))
		.map((segment) => ({
			name: segment.slice(1),
			in: 'path',
			required: true,
			schema: { type: 'string' } as JsonSchema,
		}));

	const schema = parseSchema(endpoint.requestSchema);

	return {
		operationId: endpoint.name?.trim() || undefined,
		summary: endpointLabel(endpoint),
		...(parameters.length === 0 ? {} : { parameters }),
		...(schema === undefined
			? {}
			: { requestBody: { required: true, content: { 'application/json': { schema } } } }),
		responses: { '200': { description: 'Successful response' } },
	};
}

function parseSchema(raw: string | undefined): JsonSchema | undefined {
	if (raw === undefined || raw.trim().length === 0) return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}
