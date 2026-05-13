import { readFile, stat } from 'node:fs/promises';

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

const DEFERRED_ARRAY_MESSAGE =
	'Multiple workflows in a single file are not yet supported — Task 11 of the headless implementation plan adds this.';

const DEFERRED_ARRAY_CREDENTIALS_MESSAGE =
	'Multiple credentials in a single file are not yet supported — Task 11 of the headless implementation plan adds this.';

const DEFERRED_DIRECTORY_MESSAGE =
	'Directory inputs are not yet supported — Task 11 of the headless implementation plan adds this.';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArrayOfNodes(value: unknown): value is INode[] {
	return Array.isArray(value);
}

function assertIsParsedWorkflow(value: unknown, path: string): asserts value is ParsedWorkflow {
	if (!isPlainObject(value)) {
		throw new UserError(`Workflow file ${path} must contain a workflow object.`);
	}

	if (!('nodes' in value) || !isStringArrayOfNodes(value.nodes)) {
		throw new UserError(
			`Workflow file ${path} is missing required field "nodes" (must be an array).`,
		);
	}

	if (!('connections' in value) || !isPlainObject(value.connections)) {
		throw new UserError(
			`Workflow file ${path} is missing required field "connections" (must be an object).`,
		);
	}
}

function assertIsParsedCredential(value: unknown, path: string): asserts value is ParsedCredential {
	if (!isPlainObject(value)) {
		throw new UserError(`Credentials file ${path} must contain a credential object.`);
	}

	const missing: string[] = [];
	if (typeof value.name !== 'string') missing.push('name');
	if (typeof value.type !== 'string') missing.push('type');
	if (!('data' in value)) missing.push('data');

	if (missing.length > 0) {
		throw new UserError(
			`Credentials file ${path} is missing required field${missing.length === 1 ? '' : 's'} "${missing.join('", "')}".`,
		);
	}
}

async function readAndParseJson(path: string): Promise<unknown> {
	let stats;
	try {
		stats = await stat(path);
	} catch (error) {
		const reason = error instanceof Error ? error.message : 'unknown error';
		throw new UserError(`Could not read file ${path}: ${reason}.`);
	}

	if (stats.isDirectory()) {
		throw new UserError(DEFERRED_DIRECTORY_MESSAGE);
	}

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

/**
 * Reads a workflow JSON file and normalises it to a `ParsedWorkflow[]`
 * (length 1 for v1, since arrays and directories are deferred to Task 11).
 */
export async function parseWorkflowSource(path: string): Promise<ParsedWorkflow[]> {
	const parsed = await readAndParseJson(path);

	if (Array.isArray(parsed)) {
		throw new UserError(DEFERRED_ARRAY_MESSAGE);
	}

	assertIsParsedWorkflow(parsed, path);

	return [parsed];
}

/**
 * Reads a credentials JSON file and normalises it to a `ParsedCredential[]`
 * (length 1 for v1, since arrays are deferred to Task 11).
 */
export async function parseCredentialsFile(path: string): Promise<ParsedCredential[]> {
	const parsed = await readAndParseJson(path);

	if (Array.isArray(parsed)) {
		throw new UserError(DEFERRED_ARRAY_CREDENTIALS_MESSAGE);
	}

	assertIsParsedCredential(parsed, path);

	return [parsed];
}
