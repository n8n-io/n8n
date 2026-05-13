import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';
import { jsonParse, UserError } from 'n8n-workflow';

/**
 * Minimal workflow shape required by the headless command. Mirrors the
 * fields that `crud-adapter.ts` (Task 4) will map onto a CreateWorkflowDto;
 * defined locally here so this module stays free of n8n internals.
 */
export interface ParsedWorkflow {
	id?: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
}

/**
 * Minimal credential shape required by the headless command. Mirrors the
 * fields that Task 10's createCredentials mapping needs.
 */
export interface ParsedCredential {
	id?: string;
	name: string;
	type: string;
	data: unknown;
}

const DEFERRED_DIRECTORY_CREDENTIALS_MESSAGE =
	'Directory inputs are not yet supported for credentials.';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArrayOfNodes(value: unknown): value is INode[] {
	return Array.isArray(value);
}

function assertIsParsedWorkflow(value: unknown, label: string): asserts value is ParsedWorkflow {
	if (!isPlainObject(value)) {
		throw new UserError(`Workflow ${label} must contain a workflow object.`);
	}

	if (!('nodes' in value) || !isStringArrayOfNodes(value.nodes)) {
		throw new UserError(`Workflow ${label} is missing required field "nodes" (must be an array).`);
	}

	if (!('connections' in value) || !isPlainObject(value.connections)) {
		throw new UserError(
			`Workflow ${label} is missing required field "connections" (must be an object).`,
		);
	}
}

function assertIsParsedCredential(
	value: unknown,
	label: string,
): asserts value is ParsedCredential {
	if (!isPlainObject(value)) {
		throw new UserError(`Credentials ${label} must contain a credential object.`);
	}

	const missing: string[] = [];
	if (typeof value.name !== 'string') missing.push('name');
	if (typeof value.type !== 'string') missing.push('type');
	if (!('data' in value)) missing.push('data');

	if (missing.length > 0) {
		throw new UserError(
			`Credentials ${label} is missing required field${missing.length === 1 ? '' : 's'} "${missing.join('", "')}".`,
		);
	}
}

async function readAndParseJsonFile(path: string): Promise<unknown> {
	let raw: string;
	try {
		raw = await readFile(path, { encoding: 'utf8' });
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown error';
		throw new UserError(`Could not read file ${path}: ${reason}.`);
	}

	try {
		return jsonParse<unknown>(raw);
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown parse error';
		throw new UserError(`Could not parse JSON in ${path}: ${reason}.`);
	}
}

async function statOrThrow(path: string) {
	try {
		return await stat(path);
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown error';
		throw new UserError(`Could not read file ${path}: ${reason}.`);
	}
}

function parseWorkflowsFromValue(value: unknown, path: string): ParsedWorkflow[] {
	if (Array.isArray(value)) {
		return value.map((entry, index) => {
			const label = `${path}[${index}]`;
			assertIsParsedWorkflow(entry, label);
			return entry;
		});
	}

	assertIsParsedWorkflow(value, `file ${path}`);
	return [value];
}

async function readWorkflowJsonFilesInDirectory(dir: string): Promise<string[]> {
	// Lexicographic glob: list directory entries, keep `*.json` files only,
	// sort the resulting names so callers see deterministic ordering across
	// platforms (readdir is not guaranteed to be sorted).
	const entries = await readdir(dir);
	return [...entries].filter((name) => name.endsWith('.json')).sort();
}

/**
 * Reads workflow JSON from a file or directory and normalises it to a
 * `ParsedWorkflow[]`. A file may contain a single workflow object or an array
 * of workflow objects. A directory is globbed for `*.json` in lexicographic
 * order; each file is parsed by the same rules and the results are
 * concatenated.
 */
export async function parseWorkflowSource(path: string): Promise<ParsedWorkflow[]> {
	const stats = await statOrThrow(path);

	if (stats.isDirectory()) {
		const filenames = await readWorkflowJsonFilesInDirectory(path);
		if (filenames.length === 0) {
			throw new UserError(`No *.json files found in ${path}`);
		}

		const workflows: ParsedWorkflow[] = [];
		for (const filename of filenames) {
			const filePath = join(path, filename);
			const value = await readAndParseJsonFile(filePath);
			workflows.push(...parseWorkflowsFromValue(value, filePath));
		}
		return workflows;
	}

	const value = await readAndParseJsonFile(path);
	return parseWorkflowsFromValue(value, path);
}

/**
 * Reads a credentials JSON file and normalises it to a `ParsedCredential[]`.
 * The file may contain a single credential object or an array. Directory
 * inputs are not supported (credentials are typically a single file).
 */
export async function parseCredentialsFile(path: string): Promise<ParsedCredential[]> {
	const stats = await statOrThrow(path);

	if (stats.isDirectory()) {
		throw new UserError(DEFERRED_DIRECTORY_CREDENTIALS_MESSAGE);
	}

	const value = await readAndParseJsonFile(path);

	if (Array.isArray(value)) {
		return value.map((entry, index) => {
			const label = `${path}[${index}]`;
			assertIsParsedCredential(entry, label);
			return entry;
		});
	}

	assertIsParsedCredential(value, `file ${path}`);
	return [value];
}
