// Everything the eval assumes about the new format (`n8n-node-next` and `@n8n/node-sdk/testing`).
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Outcome } from './old-executor';
import { exec, isRecord, type ExecResult } from './util';

export const SDK_DIR = path.resolve(__dirname, '../..');

/** The `n8n-node-next` bin of the package, run with this Node. */
function cliCommand(): readonly string[] {
	const manifest: unknown = JSON.parse(readFileSync(path.join(SDK_DIR, 'package.json'), 'utf8'));
	const bin =
		isRecord(manifest) && isRecord(manifest.bin) ? manifest.bin['n8n-node-next'] : undefined;
	if (typeof bin !== 'string') throw new Error('@n8n/node-sdk has no n8n-node-next bin');
	return [process.execPath, path.join(SDK_DIR, bin)];
}

export async function scaffoldNewProject(dir: string, service: string): Promise<ExecResult> {
	const [command, ...args] = cliCommand();
	return await exec(command, [...args, 'new', service, '--dir', dir], {
		cwd: path.dirname(dir),
		timeoutMs: 120_000,
	});
}

/** A `n8n-node-next` shim in the project's `.bin`, so agent and grader call the same CLI. */
export async function writeCliShim(binDir: string) {
	const file = path.join(binDir, 'n8n-node-next');
	const quoted = cliCommand().map((part) => `'${part}'`);
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
