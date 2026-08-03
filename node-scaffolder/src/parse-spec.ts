import { readFileSync } from 'node:fs';

import { parse as parseYaml } from 'yaml';

import type { AuthType, NodeSpec, OperationSpec, ResourceSpec } from './types.js';

function toPascalCase(input: string): string {
	return input
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

function toCamelCase(input: string): string {
	const pascal = toPascalCase(input);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function defaultOperations(resourceValue: string): OperationSpec[] {
	return [
		{
			name: 'Get Many',
			value: 'getAll',
			method: 'GET',
			path: `/${resourceValue}s`,
			description: `Get many ${resourceValue}s`,
		},
		{
			name: 'Get',
			value: 'get',
			method: 'GET',
			path: `/${resourceValue}s/{{$parameter["${resourceValue}Id"]}}`,
			description: `Get a ${resourceValue}`,
		},
	];
}

function normalizeSpec(raw: Record<string, unknown>): NodeSpec {
	const displayName =
		typeof raw.displayName === 'string'
			? raw.displayName
			: typeof raw.name === 'string'
				? toPascalCase(raw.name)
				: 'Example';
	const name =
		typeof raw.name === 'string' && /^[a-z][a-zA-Z0-9]*$/.test(raw.name)
			? raw.name
			: toCamelCase(displayName);

	const auth = (raw.auth as AuthType) ?? 'apiKey';
	const resourcesRaw = Array.isArray(raw.resources) ? raw.resources : [];

	const resources: ResourceSpec[] =
		resourcesRaw.length > 0
			? resourcesRaw.map((resource) => {
					const r = resource as Record<string, unknown>;
					const resourceName = String(r.name ?? 'Item');
					const resourceValue = String(r.value ?? toCamelCase(resourceName));
					const opsRaw = Array.isArray(r.operations) ? r.operations : [];
					const operations: OperationSpec[] =
						opsRaw.length > 0
							? opsRaw.map((op) => {
									const o = op as Record<string, unknown>;
									return {
										name: String(o.name ?? 'Get Many'),
										value: String(o.value ?? 'getAll'),
										method: (String(o.method ?? 'GET').toUpperCase() ||
											'GET') as OperationSpec['method'],
										path: String(o.path ?? `/${resourceValue}s`),
										description: o.description ? String(o.description) : undefined,
									};
								})
							: defaultOperations(resourceValue);

					return {
						name: resourceName,
						value: resourceValue,
						operations,
					};
				})
			: [
					{
						name: 'Item',
						value: 'item',
						operations: defaultOperations('item'),
					},
				];

	return {
		name,
		displayName,
		description:
			typeof raw.description === 'string'
				? raw.description
				: `Interact with the ${displayName} API`,
		baseUrl:
			typeof raw.baseUrl === 'string' ? raw.baseUrl.replace(/\/$/, '') : 'https://api.example.com',
		auth: ['none', 'apiKey', 'oAuth2'].includes(auth) ? auth : 'apiKey',
		resources,
		simulation: Boolean(raw.simulation),
	};
}

export function loadSpecFromYaml(filePath: string): NodeSpec {
	const raw = parseYaml(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
	return normalizeSpec(raw);
}

/**
 * Deterministic text parser — no LLM.
 * Examples: "add a node for the Etsy REST API"
 */
export function parseSpecFromText(text: string): NodeSpec {
	const cleaned = text.trim();
	const match =
		cleaned.match(
			/(?:add|create|build|scaffold)?\s*(?:a\s+)?(?:node\s+for\s+(?:the\s+)?)?(.+?)(?:\s+REST(?:\s+API)?|\s+API)?$/i,
		) ?? null;

	const servicePhrase = (match?.[1] ?? cleaned)
		.replace(/\b(the|a|an|for|node|rest|api)\b/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	const displayName = toPascalCase(servicePhrase || 'Example');
	const name = toCamelCase(displayName);
	const slug = displayName.toLowerCase();

	return normalizeSpec({
		name,
		displayName,
		description: `Interact with the ${displayName} REST API`,
		baseUrl: `https://api.${slug}.com/v1`,
		auth: 'apiKey',
		simulation: true,
		resources: [
			{
				name: 'Item',
				value: 'item',
				operations: defaultOperations('item'),
			},
		],
	});
}

export { toPascalCase, toCamelCase };
