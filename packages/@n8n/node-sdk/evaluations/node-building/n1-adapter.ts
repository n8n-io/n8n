// Everything the eval assumes about the new format (`n8n-node-next` and `@n8n/node-sdk/testing`).
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ICredentialType, INodeType } from 'n8n-workflow';

import type { OldPackage, Outcome } from './old-executor';
import { exec, isRecord, type ExecResult } from './util';

export const SDK_DIR = path.resolve(__dirname, '../..');

/** The `n8n-node-next` bin of the package, run with this Node. */
function cliCommand(sdkDir = SDK_DIR): readonly string[] {
	const manifest: unknown = JSON.parse(readFileSync(path.join(sdkDir, 'package.json'), 'utf8'));
	const bin =
		isRecord(manifest) && isRecord(manifest.bin) ? manifest.bin['n8n-node-next'] : undefined;
	if (typeof bin !== 'string') throw new Error('@n8n/node-sdk has no n8n-node-next bin');
	return [process.execPath, path.join(sdkDir, bin)];
}

export async function scaffoldNewProject(dir: string, service: string): Promise<ExecResult> {
	const [command, ...args] = cliCommand();
	return await exec(command, [...args, 'new', service, '--dir', dir], {
		cwd: path.dirname(dir),
		timeoutMs: 120_000,
	});
}

/** A `n8n-node-next` shim in the project's `.bin`, so agent and grader call the same CLI. */
export async function writeCliShim(binDir: string, sdkDir: string) {
	const file = path.join(binDir, 'n8n-node-next');
	const quoted = cliCommand(sdkDir).map((part) => `'${part}'`);
	await writeFile(file, `#!/bin/sh\nexec ${quoted.join(' ')} "$@"\n`, { mode: 0o755 });
}

export const CHECK_COMMAND = ['n8n-node-next', 'check'] as const;

export interface NewProject {
	readonly node: Record<string, unknown>;
	readonly actions: ReadonlyArray<Record<string, unknown>>;
	readonly credentials: ReadonlyArray<Record<string, unknown>>;
}

const records = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);

const isProjection = (value: unknown): value is (type: unknown) => unknown =>
	typeof value === 'function';

/**
 * Imports `src/index.ts` of the project. Run the eval with tsx so the import compiles. The
 * credential types come from `node.credential`, projected by the project's own SDK.
 */
export async function loadNewProject(dir: string): Promise<NewProject> {
	const loaded: unknown = await import(pathToFileURL(path.join(dir, 'src/index.ts')).href);
	const exports = isRecord(loaded) ? loaded : {};
	const node = isRecord(exports.node) ? exports.node : {};
	const resolved = createRequire(path.join(dir, 'package.json')).resolve('@n8n/node-sdk/host');
	const sdk: unknown = await import(pathToFileURL(resolved).href);
	const project = isRecord(sdk) ? sdk.toCredentialType : undefined;
	const types = isRecord(node.credential) ? records(node.credential.types) : [];
	return {
		node,
		actions: records(exports.actions),
		credentials: isProjection(project) ? records(types.map(project)) : [],
	};
}

const isConstructor = (value: unknown): value is new () => unknown => typeof value === 'function';

const isNodeType = (value: unknown): value is INodeType =>
	isRecord(value) && isRecord(value.description) && Array.isArray(value.description.properties);

const isCredentialType = (value: unknown): value is ICredentialType =>
	isRecord(value) && typeof value.name === 'string' && Array.isArray(value.properties);

/**
 * The actions as n8n node types, keyed by action ID, made by `toNodeType` of the project's own
 * SDK host, as n8n loads them. The grader runs them like a community node.
 */
export async function n8nPackageOf(dir: string, project: NewProject): Promise<OldPackage> {
	const resolved = createRequire(path.join(dir, 'package.json')).resolve('@n8n/node-sdk/host');
	const sdk: unknown = await import(pathToFileURL(resolved).href);
	const toNodeType = isRecord(sdk) ? sdk.toNodeType : undefined;
	if (!isProjection(toNodeType)) throw new Error('@n8n/node-sdk/host has no toNodeType');
	const nodeTypes = project.actions.flatMap((action) => {
		const type = toNodeType(action);
		const instance: unknown = isConstructor(type) ? new type() : undefined;
		return typeof action.id === 'string' && isNodeType(instance) ? [[action.id, instance]] : [];
	});
	return {
		nodeTypes: Object.fromEntries(nodeTypes),
		credentialTypes: Object.fromEntries(
			project.credentials.filter(isCredentialType).map((type) => [type.name, type]),
		),
	};
}

type RunAction = (action: unknown, options: Record<string, unknown>) => Promise<unknown>;

const isRunAction = (value: unknown): value is RunAction => typeof value === 'function';

const errorText = (value: unknown) =>
	value instanceof Error ? value.message : isRecord(value) ? JSON.stringify(value) : String(value);

const messageOf = (value: unknown) =>
	isRecord(value) && typeof value.message === 'string' ? value.message : undefined;

/**
 * Runs one action through `runAction` from the project's own `@n8n/node-sdk/testing`.
 * With `continueOnFail`, a failure becomes one `{ error }` item, as the SDK executor does in n8n.
 */
export async function runNewAction(
	dir: string,
	project: NewProject,
	action: Record<string, unknown>,
	input: Record<string, unknown>,
	credential?: { readonly type: string; readonly data: Record<string, unknown> },
	continueOnFail = false,
): Promise<Outcome> {
	const resolved = createRequire(path.join(dir, 'package.json')).resolve('@n8n/node-sdk/testing');
	const testing: unknown = await import(pathToFileURL(resolved).href);
	const runAction = isRecord(testing) ? testing.runAction : undefined;
	if (!isRunAction(runAction))
		return { ok: false, error: '@n8n/node-sdk/testing has no runAction' };
	const outcome = await runAction(action, {
		input,
		...(credential ? { credential, credentials: project.credentials } : {}),
	}).then(
		(result): Outcome => {
			if (isRecord(result) && result.ok === true && Array.isArray(result.items)) {
				return { ok: true, items: result.items };
			}
			const error = isRecord(result) ? result.error : result;
			const message = messageOf(error);
			return { ok: false, error: errorText(error), ...(message ? { message } : {}) };
		},
		(error: unknown): Outcome => ({ ok: false, error: errorText(error) }),
	);
	return continueOnFail && !outcome.ok
		? { ok: true, items: [{ error: outcome.message ?? outcome.error }] }
		: outcome;
}
