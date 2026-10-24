import { bundle, createConfig } from '@redocly/openapi-core';
import type { IHttpRequestMethods } from 'n8n-workflow';
import path from 'node:path';
import { OpenAPIV3 } from 'openapi-types';

import type { ApiParameter, Schema, SpecOperation } from './types';

type Ref = OpenAPIV3.ReferenceObject;

const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

const HTTP_METHODS: Array<[IHttpRequestMethods, OpenAPIV3.HttpMethods]> = [
	['DELETE', OpenAPIV3.HttpMethods.DELETE],
	['GET', OpenAPIV3.HttpMethods.GET],
	['HEAD', OpenAPIV3.HttpMethods.HEAD],
	['PATCH', OpenAPIV3.HttpMethods.PATCH],
	['POST', OpenAPIV3.HttpMethods.POST],
	['PUT', OpenAPIV3.HttpMethods.PUT],
];

const isRef = (value: object): value is Ref => '$ref' in value;

const resolved = <T extends object>(value: T | Ref | undefined): T | undefined =>
	value === undefined || isRef(value) ? undefined : value;

function isDocument(value: unknown): value is OpenAPIV3.Document {
	return typeof value === 'object' && value !== null && 'openapi' in value && 'paths' in value;
}

function toSchema(value: OpenAPIV3.SchemaObject | Ref | undefined): Schema {
	const schema = resolved(value) ?? {};
	return {
		type: schema.type,
		format: schema.format,
		enum: schema.enum,
		default: schema.default,
		description: schema.description,
		readOnly: schema.readOnly === true,
		items: 'items' in schema ? toSchema(schema.items) : undefined,
		properties:
			schema.properties &&
			Object.fromEntries(Object.entries(schema.properties).map(([k, v]) => [k, toSchema(v)])),
		required: schema.required ?? [],
	};
}

export const isFlatObjectList = (schema: Schema) =>
	schema.type === 'array' &&
	schema.items?.type === 'object' &&
	Object.values(schema.items.properties ?? {}).length > 0 &&
	Object.values(schema.items.properties ?? {}).every((s) => SCALAR_TYPES.has(s.type ?? ''));

function readParameters(operation: OpenAPIV3.OperationObject) {
	const parameters: ApiParameter[] = [];
	const specParameters = (operation.parameters ?? []).flatMap((p) => resolved(p) ?? []);
	const paginated = specParameters.some((p) => p.in === 'query' && p.name === 'cursor');

	for (const parameter of specParameters) {
		const { name, in: location } = parameter;
		if (location !== 'path' && location !== 'query') continue;
		if (paginated && (name === 'cursor' || name === 'limit')) continue;
		const schema = toSchema(parameter.schema);
		parameters.push({
			wire: `${location}:${name}`,
			name,
			location,
			required: location === 'path' || parameter.required === true,
			schema,
			description: parameter.description ?? schema.description,
		});
	}

	const requestBody = resolved(operation.requestBody);
	const bodySchema = requestBody?.content['application/json']?.schema;
	if (!requestBody || !bodySchema) return { parameters, paginated };

	const body = toSchema(bodySchema);
	if (body.type === 'object' && body.properties) {
		for (const [name, schema] of Object.entries(body.properties)) {
			if (schema.readOnly) continue;
			parameters.push({
				wire: `body:${name}`,
				name,
				location: 'body',
				required: (body.required ?? []).includes(name),
				schema,
				description: schema.description,
			});
		}
	} else {
		parameters.push({
			wire: 'body:$',
			name: 'body',
			location: 'wholeBody',
			required: requestBody.required === true,
			schema: body,
			description: body.description,
		});
	}

	return { parameters, paginated };
}

function successMediaTypes(operation: OpenAPIV3.OperationObject) {
	return Object.entries(operation.responses)
		.filter(([status]) => status.startsWith('2'))
		.flatMap(([, response]) => Object.keys(resolved(response)?.content ?? {}));
}

function unsupportedReason(operation: OpenAPIV3.OperationObject, responseTypes: string[]) {
	if (operation.deprecated) return 'generator: the API marks this operation as deprecated';
	const requestTypes = Object.keys(resolved(operation.requestBody)?.content ?? {});
	const requestType = requestTypes.find((type) => type !== 'application/json');
	if (requestType) return `generator: ${requestType} request bodies are not supported`;
	const responseType = responseTypes.find((type) => type !== 'application/json');
	if (responseType) return `generator: ${responseType} responses are not supported`;
	return undefined;
}

export async function readSpecOperations(specDir: string): Promise<SpecOperation[]> {
	const { bundle: document, problems } = await bundle({
		ref: path.join(specDir, 'openapi.decorator-routes.generated.yml'),
		config: await createConfig({}),
		dereference: true,
	});
	const errors = problems.filter((problem) => problem.severity === 'error');
	if (errors.length) {
		const messages = errors.map((problem) => problem.message).join('\n- ');
		throw new Error(`Cannot read the public API spec:\n- ${messages}`);
	}
	const doc: unknown = document.parsed;
	if (!isDocument(doc)) throw new Error('The public API spec is not an OpenAPI 3 document');

	const operations: SpecOperation[] = [];
	for (const [apiPath, item] of Object.entries(doc.paths)) {
		for (const [method, key] of HTTP_METHODS) {
			const operation = item?.[key];
			if (!operation) continue;
			const responseTypes = successMediaTypes(operation);
			operations.push({
				operationId: operation.operationId ?? '',
				tag: operation.tags?.[0] ?? 'Other',
				method,
				apiPath,
				summary: operation.summary,
				description: operation.description,
				scope: 'x-required-scope' in operation ? String(operation['x-required-scope']) : undefined,
				emptyResponse: responseTypes.length === 0,
				unsupported: unsupportedReason(operation, responseTypes),
				...readParameters(operation),
			});
		}
	}

	return operations.sort((a, b) => a.operationId.localeCompare(b.operationId));
}
