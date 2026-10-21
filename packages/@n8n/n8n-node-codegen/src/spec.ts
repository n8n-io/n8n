import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { IHttpRequestMethods } from 'n8n-workflow';
import { parse } from 'yaml';

import type { ApiParameter, Schema, SpecOperation } from './types';

type YamlObject = Record<string, unknown>;

const SCALAR_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

const HTTP_METHODS: IHttpRequestMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];

function toHttpMethod(method: string): IHttpRequestMethods {
	const found = HTTP_METHODS.find((m) => m === method.toUpperCase());
	if (!found) throw new Error(`Unsupported HTTP method "${method}"`);
	return found;
}

const isObject = (value: unknown): value is YamlObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const asObject = (value: unknown): YamlObject => (isObject(value) ? value : {});
const asString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const loadYaml = (file: string): unknown => parse(readFileSync(file, 'utf8'));

function deref(node: unknown, fromFile: string): unknown {
	if (Array.isArray(node)) return node.map((item) => deref(item, fromFile));
	if (!isObject(node)) return node;
	const ref = asString(node.$ref);
	if (ref) {
		const target = path.resolve(path.dirname(fromFile), ref);
		return deref(loadYaml(target), target);
	}
	return Object.fromEntries(
		Object.entries(node).map(([key, value]) => [key, deref(value, fromFile)]),
	);
}

function toSchema(value: unknown): Schema {
	const raw = asObject(value);
	const properties = isObject(raw.properties)
		? Object.fromEntries(Object.entries(raw.properties).map(([key, v]) => [key, toSchema(v)]))
		: undefined;
	return {
		type: asString(raw.type),
		format: asString(raw.format),
		enum: Array.isArray(raw.enum) ? raw.enum : undefined,
		default: raw.default,
		description: asString(raw.description),
		readOnly: raw.readOnly === true,
		items: raw.items === undefined ? undefined : toSchema(raw.items),
		properties,
		required: asArray(raw.required).flatMap((r) => (typeof r === 'string' ? [r] : [])),
	};
}

export const isFlatObjectList = (schema: Schema) =>
	schema.type === 'array' &&
	schema.items?.type === 'object' &&
	Object.values(schema.items.properties ?? {}).length > 0 &&
	Object.values(schema.items.properties ?? {}).every((s) => SCALAR_TYPES.has(s.type ?? ''));

function readParameters(spec: YamlObject) {
	const parameters: ApiParameter[] = [];
	const specParameters = asArray(spec.parameters).map(asObject);
	const paginated = specParameters.some((p) => p.in === 'query' && p.name === 'cursor');

	for (const parameter of specParameters) {
		const name = asString(parameter.name) ?? '';
		const location = parameter.in;
		if (location !== 'path' && location !== 'query') continue;
		if (paginated && (name === 'cursor' || name === 'limit')) continue;
		const schema = toSchema(parameter.schema);
		parameters.push({
			wire: `${location}:${name}`,
			name,
			location,
			required: location === 'path' || parameter.required === true,
			schema,
			description: asString(parameter.description) ?? schema.description,
		});
	}

	const requestBody = asObject(spec.requestBody);
	const jsonBody = asObject(asObject(requestBody.content)['application/json']);
	if (jsonBody.schema === undefined) return { parameters, paginated };

	const body = toSchema(jsonBody.schema);
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

function successMediaTypes(responses: unknown, fromFile: string) {
	const types = new Set<string>();
	for (const [status, response] of Object.entries(asObject(responses))) {
		if (!status.startsWith('2')) continue;
		const ref = asString(asObject(response).$ref);
		const resolved = ref ? loadYaml(path.resolve(path.dirname(fromFile), ref)) : response;
		for (const mediaType of Object.keys(asObject(asObject(resolved).content))) types.add(mediaType);
	}
	return [...types];
}

function unsupportedReason(spec: YamlObject, responseTypes: string[]) {
	if (spec.deprecated === true) return 'generator: the API marks this operation as deprecated';
	const requestType = Object.keys(asObject(asObject(spec.requestBody).content)).find(
		(type) => type !== 'application/json',
	);
	if (requestType) return `generator: ${requestType} request bodies are not supported`;
	const responseType = responseTypes.find((type) => type !== 'application/json');
	if (responseType) return `generator: ${responseType} responses are not supported`;
	return undefined;
}

export function readSpecOperations(specDir: string): SpecOperation[] {
	const root = asObject(loadYaml(path.join(specDir, 'openapi.decorator-routes.generated.yml')));
	const operations: SpecOperation[] = [];

	for (const [apiPath, methods] of Object.entries(asObject(root.paths))) {
		for (const [method, entry] of Object.entries(asObject(methods))) {
			const file = path.resolve(specDir, asString(asObject(entry).$ref) ?? '');
			const { responses, ...request } = asObject(loadYaml(file));
			const spec = asObject(deref(request, file));
			const responseTypes = successMediaTypes(responses, file);
			operations.push({
				operationId: asString(spec.operationId) ?? '',
				tag: asString(asArray(spec.tags)[0]) ?? 'Other',
				method: toHttpMethod(method),
				apiPath,
				summary: asString(spec.summary),
				description: asString(spec.description),
				scope: asString(spec['x-required-scope']),
				emptyResponse: responseTypes.length === 0,
				unsupported: unsupportedReason(spec, responseTypes),
				...readParameters(spec),
			});
		}
	}

	return operations.sort((a, b) => a.operationId.localeCompare(b.operationId));
}
