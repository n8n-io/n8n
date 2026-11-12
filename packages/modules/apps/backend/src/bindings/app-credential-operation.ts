import {
	listAppCredentialOperations,
	type AppCredentialBinding,
	type AppCredentialOperation,
	type AppCredentialOperationEntry,
	type AppJsonSchema,
} from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import { jsonSchemaToZod, type JsonSchemaObject } from '@n8n/json-schema-to-zod';

import type { AppHttpRequest } from './app-binding-ports';
import { AppRuntimeError } from './app-runtime.error';

type ParamLocation = 'path' | 'query' | 'header' | 'body';

export interface OperationParam {
	name: string;
	in: ParamLocation;
	required: boolean;
	schema: AppJsonSchema;
}

const PATH_PARAM = /\{([^}]+)\}/g;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFixed(schema: AppJsonSchema): boolean {
	return 'const' in schema;
}

export function requestBodySchema(operation: AppCredentialOperation): AppJsonSchema | undefined {
	return operation.requestBody?.content['application/json'].schema;
}

export function responseSchema(operation: AppCredentialOperation): AppJsonSchema | undefined {
	const responses = operation.responses ?? {};
	const success = responses['200'] ?? responses['201'] ?? responses.default;
	return success?.content?.['application/json'].schema;
}

/** All values of one operation, flat: path, query and header parameters plus the top-level body properties. */
export function operationParams(operation: AppCredentialOperation): OperationParam[] {
	const params: OperationParam[] = (operation.parameters ?? []).map((param) => ({
		name: param.name,
		in: param.in,
		required: param.in === 'path' || param.required === true,
		schema: param.schema,
	}));
	const body = requestBodySchema(operation);
	if (body && isRecord(body.properties)) {
		const required = new Set(Array.isArray(body.required) ? body.required : []);
		for (const [name, schema] of Object.entries(body.properties)) {
			params.push({
				name,
				in: 'body',
				required: required.has(name),
				schema: isRecord(schema) ? schema : {},
			});
		}
	}
	return params;
}

/** Throws a `BadRequestError` when an operation definition cannot build a safe request. */
export function assertValidOperations(binding: AppCredentialBinding) {
	for (const { operationId, path, operation } of listAppCredentialOperations(binding)) {
		const fail = (message: string) => {
			throw new BadRequestError(`Binding "${binding.key}", operation "${operationId}": ${message}`);
		};
		if (path.split('/').some((segment) => segment === '.' || segment === '..')) {
			fail('the path must not contain "." or ".." segments.');
		}
		const params = operationParams(operation);
		const names = params.map((param) => param.name);
		if (new Set(names).size !== names.length) fail('parameter names must be unique.');
		const pathNames = [...path.matchAll(PATH_PARAM)].map((match) => match[1]);
		for (const name of pathNames) {
			if (!params.some((param) => param.in === 'path' && param.name === name)) {
				fail(`path parameter "${name}" is not defined.`);
			}
		}
		for (const param of params) {
			if (param.in === 'path' && !pathNames.includes(param.name)) {
				fail(`parameter "${param.name}" is not in the path.`);
			}
			if (param.in === 'header' && !isFixed(param.schema)) {
				fail(`header "${param.name}" must have a const value.`);
			}
		}
	}
}

function invalid(message: string): never {
	throw new AppRuntimeError(400, 'invalid_input', message);
}

function validate(param: OperationParam, value: unknown): unknown {
	const result = jsonSchemaToZod(param.schema as JsonSchemaObject).safeParse(value);
	if (!result.success) invalid(`Parameter "${param.name}" is not valid.`);
	return result.data;
}

function encodeSegment(name: string, value: unknown): string {
	const text = String(value);
	if (text === '' || text === '.' || text === '..' || /[/\\%]/.test(text)) {
		invalid(`Path parameter "${name}" must be one path segment.`);
	}
	return encodeURIComponent(text);
}

/**
 * Builds the request of one operation from the client parameters. The client
 * cannot change the URL, the method, a header or a `const` value.
 */
export function buildOperationRequest(
	binding: AppCredentialBinding,
	operationId: string,
	clientParams: Record<string, unknown>,
): AppHttpRequest {
	const entry: AppCredentialOperationEntry | undefined = listAppCredentialOperations(binding).find(
		(op) => op.operationId === operationId,
	);
	if (!entry) {
		throw new AppRuntimeError(
			404,
			'operation_not_found',
			`The binding "${binding.key}" has no operation "${operationId}".`,
		);
	}

	const params = operationParams(entry.operation);
	const known = new Set(params.filter((param) => !isFixed(param.schema)).map((p) => p.name));
	for (const name of Object.keys(clientParams)) {
		if (!known.has(name)) invalid(`Unknown parameter "${name}".`);
	}

	const values = new Map<string, unknown>();
	for (const param of params) {
		if (isFixed(param.schema)) {
			values.set(param.name, param.schema.const);
			continue;
		}
		const value = clientParams[param.name];
		if (value === undefined) {
			if (param.required) invalid(`Parameter "${param.name}" is required.`);
			continue;
		}
		values.set(param.name, validate(param, value));
	}

	const pick = (location: ParamLocation) =>
		params.filter((param) => param.in === location && values.has(param.name));

	const path = entry.path.replace(PATH_PARAM, (_, name: string) =>
		encodeSegment(name, values.get(name)),
	);
	const base = new URL(binding.servers[0].url);
	const basePath = base.pathname.replace(/\/$/, '');
	const url = new URL(base.origin + basePath + path);
	if (url.origin !== base.origin || url.pathname !== basePath + path) {
		invalid('The request URL leaves the server of the binding.');
	}
	for (const param of pick('query')) {
		url.searchParams.set(param.name, String(values.get(param.name)));
	}

	const headers: Record<string, string> = { accept: 'application/json' };
	for (const param of pick('header')) headers[param.name] = String(values.get(param.name));

	const bodyParams = pick('body');
	const hasBody = requestBodySchema(entry.operation) !== undefined;
	if (hasBody) headers['content-type'] = 'application/json';

	return {
		method: entry.method.toUpperCase(),
		url: url.toString(),
		headers,
		...(hasBody && {
			body: Object.fromEntries(bodyParams.map((param) => [param.name, values.get(param.name)])),
		}),
	};
}
