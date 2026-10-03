import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ICredentialType } from 'n8n-workflow';

import { checkCredentialType, toCredentialType } from '../credentials';
import { actionFileOf, checkAction, type Action, type NodeDefinition } from '../define';

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

/** The action files that no action names, e.g. a new file that `src/index.ts` does not list. */
function unlistedActionFiles(root: string, actions: readonly Action[]): string[] {
	const dir = join(root, 'src', 'actions');
	const listed = new Set(actions.map((action) => join('src', actionFileOf(action))));
	return (existsSync(dir) ? readdirSync(dir) : [])
		.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
		.map((file) => join('src', 'actions', file))
		.filter((file) => !listed.has(file));
}

/** Contract checks, one line each: `<file>: <action id>: <schema path>: <problem>`. */
export function checkContracts({ root, node, actions }: Project): string[] {
	const actionIssues = actions.flatMap((action, index) => {
		// The file name repeats the resource and operation of the id, so a renamed action fails here.
		const file = join('src', actionFileOf(action));
		const hasFile = existsSync(join(root, file));
		return [
			...(hasFile ? [] : [`file: must be ${file}`]),
			...(actions.findIndex(({ id }) => id === action.id) < index ? ['id: is not unique'] : []),
			...(action.node.id !== node.id ? [`node: is "${action.node.id}", not "${node.id}"`] : []),
			...checkAction(action).map((issue) => issue.replace(`${action.id}: `, '')),
		].map((issue) => `${hasFile ? file : join('src', 'index.ts')}: ${action.id}: ${issue}`);
	});
	return [
		...actionIssues,
		...unlistedActionFiles(root, actions).map(
			(file) => `${file}: exports no action that src/index.ts lists`,
		),
		...(node.credential?.types ?? []).flatMap((type) =>
			checkCredentialType(type).map((issue) => `${fileOf(root, type.id)}: ${issue}`),
		),
	];
}
