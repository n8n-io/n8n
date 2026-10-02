import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ICredentialType } from 'n8n-workflow';

import { toCredentialType } from '../credentials';
import {
	actionFileOf,
	lintContract,
	toContract,
	type Action,
	type NodeDefinition,
} from '../define';
import type { JsonSchema } from '../schema';
import { exampleOf, validate } from '../validate';

export interface Project {
	readonly root: string;
	readonly node: NodeDefinition;
	readonly actions: readonly Action[];
	/** The n8n credential types of the node's credential. A `compat` type has none here. */
	readonly credentials: readonly ICredentialType[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isNode = (value: unknown): value is NodeDefinition =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	(value.credential === undefined || isRecord(value.credential));

const isAction = (value: unknown): value is Action =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	(typeof value.run === 'function' || isRecord(value.request) || isRecord(value.list)) &&
	isRecord(value.inputSchema) &&
	Array.isArray(value.credentialTypes);

const isArrayOf = <T>(value: unknown, guard: (entry: unknown) => entry is T): value is T[] =>
	Array.isArray(value) && value.every(guard);

/** Loads `src/index.ts`, which must export `node` and `actions`. */
export async function loadProject(root: string): Promise<Project> {
	const entry = join(root, 'src', 'index.ts');
	const loaded: unknown = await import(pathToFileURL(entry).href);
	const exports: unknown = isRecord(loaded) && !('actions' in loaded) ? loaded.default : loaded;
	if (!isRecord(exports)) throw new Error(`${entry} has no exports`);
	const { node, actions } = exports;
	if (!isNode(node)) throw new Error('src/index.ts must export "node" (a defineNode result)');
	if (!isArrayOf(actions, isAction)) {
		throw new Error(
			'src/index.ts must export "actions" (an array of node.action or resource.action results)',
		);
	}
	const credentials = (node.credential?.types ?? []).flatMap(
		(type) => toCredentialType(type) ?? [],
	);
	return { root, node, actions, credentials };
}

const sourceFiles = (root: string) =>
	readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
		.sort()
		.map((file) => join(root, 'src', file));

/** The source file that declares `id` as a string literal. */
function fileOf(root: string, id: string): string {
	const literals = [`'${id}'`, `"${id}"`, `\`${id}\``];
	const file = sourceFiles(root).find((path) => {
		const source = readFileSync(path, 'utf8');
		return literals.some((literal) => source.includes(literal));
	});
	return relative(root, file ?? join(root, 'src', 'index.ts'));
}

/** Each `examples` value in `schema`, checked against the schema that lists it. */
function exampleIssues(schema: JsonSchema, at: string): string[] {
	const own = (schema.examples ?? []).flatMap((example, index) =>
		validate(example, schema, { path: `${at}.examples[${index}]` }),
	);
	const { additionalProperties } = schema;
	const children: Array<[string, JsonSchema]> = [
		...Object.entries(schema.properties ?? {}).map(([key, child]): [string, JsonSchema] => [
			`${at}.${key}`,
			child,
		]),
		...(schema.items ? [[`${at}[]`, schema.items] satisfies [string, JsonSchema]] : []),
		...(schema.oneOf ?? schema.anyOf ?? []).map((child): [string, JsonSchema] => [at, child]),
		...(typeof additionalProperties === 'object'
			? [[`${at}.*`, additionalProperties] satisfies [string, JsonSchema]]
			: []),
	];
	return [...own, ...children.flatMap(([path, child]) => exampleIssues(child, path))];
}

/** An item of the derived shape must also match `output`, which n8n checks at run time. */
function deriveOutputIssues(action: Action): string[] {
	if (!action.deriveOutput) return [];
	const sample = exampleOf(action.inputSchema);
	// Without a valid sample input there is nothing to derive from.
	if (!isRecord(sample) || validate(sample, action.inputSchema).length > 0) return [];
	try {
		const derived = action.deriveOutput(sample);
		return validate(exampleOf(derived), action.output.json, { path: 'deriveOutput' });
	} catch (error) {
		return [`deriveOutput: throws for ${JSON.stringify(sample)}: ${String(error)}`];
	}
}

const TEMPLATE_FIELD = /\$credentials\.(\w+)/g;

function credentialIssues(credential: ICredentialType): string[] {
	const auth = credential.authenticate;
	if (!auth || typeof auth === 'function') return [];
	const fields = new Set(credential.properties.map(({ name }) => name));
	const templates = [
		...Object.values(auth.properties.headers ?? {}),
		...Object.values(auth.properties.qs ?? {}),
	].map(String);
	return templates
		.flatMap((template) => [...template.matchAll(TEMPLATE_FIELD)].map((match) => match[1] ?? ''))
		.filter((field) => !fields.has(field))
		.map((field) => `authenticate: $credentials.${field} is not a property`);
}

/** Contract checks, one line each: `<file>: <action id>: <schema path>: <problem>`. */
export function checkContracts({ root, node, actions, credentials }: Project): string[] {
	const scopes = Object.keys(node.credential?.scopes ?? {});
	const at = (id: string) => (issue: string) => `${fileOf(root, id)}: ${id}: ${issue}`;
	const actionIssues = actions.flatMap((action, index) => {
		// The file name repeats the resource and operation of the id, so a renamed action fails here.
		const file = join('src', actionFileOf(action));
		const hasFile = existsSync(join(root, file));
		return [
			...(hasFile ? [] : [`file: must be ${file}`]),
			...(actions.findIndex(({ id }) => id === action.id) < index ? ['id: is not unique'] : []),
			...(action.node.id !== node.id ? [`node: is "${action.node.id}", not "${node.id}"`] : []),
			...lintContract(toContract(action)).map((issue) => issue.replace(`${action.id}: `, '')),
			...exampleIssues(action.inputSchema, 'input'),
			...exampleIssues(action.output.json, 'output'),
			...deriveOutputIssues(action),
			...action.scopes
				.filter((scope) => !scopes.includes(scope))
				.map((scope) => `scopes: "${scope}" is not a scope of the node's credential`),
		].map((issue) => `${hasFile ? file : join('src', 'index.ts')}: ${action.id}: ${issue}`);
	});
	return [
		...actionIssues,
		...credentials.flatMap((credential) => credentialIssues(credential).map(at(credential.name))),
	];
}
