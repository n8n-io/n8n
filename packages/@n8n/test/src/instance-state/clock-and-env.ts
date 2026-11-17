import { UnexpectedError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { WorkflowTestError } from '../errors';
import type { ExecuteWorkflowOptions } from '../execution-context';

interface LuxonSettings {
	now: () => number;
	defaultZone: unknown;
}

export async function withClockAndEnv<T>(
	{ now, env }: ExecuteWorkflowOptions,
	run: () => Promise<T>,
): Promise<T> {
	const restoreLuxon = await setLuxon(now === undefined ? undefined : toTime(now));
	const originalEnv = process.env;
	process.env = env
		? { ...env, N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false' }
		: { ...originalEnv, N8N_BLOCK_ENV_ACCESS_IN_NODE: 'true' };
	try {
		return await run();
	} finally {
		process.env = originalEnv;
		restoreLuxon();
	}
}

function toTime(now: string | Date) {
	const time = new Date(now).getTime();
	if (!Number.isNaN(time)) return time;
	throw new WorkflowTestError(
		'INVALID_OPTION',
		`The now option "${String(now)}" is not a valid time.`,
	);
}

async function setLuxon(time: number | undefined) {
	const restores = (await luxonSettings()).map((settings) => {
		const { now, defaultZone } = settings;
		if (time !== undefined) settings.now = () => time;
		return () => {
			settings.now = now;
			settings.defaultZone = defaultZone;
		};
	});
	return () => restores.reverse().forEach((restore) => restore());
}

// $now, $today and the workflow time zone use the luxon that n8n-workflow loads. A process that loads
// n8n-workflow as CommonJS and as ESM (Vitest does) has two luxon copies.
async function luxonSettings(): Promise<LuxonSettings[]> {
	const fromWorkflow = createRequire(require.resolve('n8n-workflow'));
	const manifestPath = fromWorkflow.resolve('luxon/package.json');
	const esmEntry = path.join(path.dirname(manifestPath), esmEntryOf(fromWorkflow(manifestPath)));
	const builds: unknown[] = [fromWorkflow('luxon'), await import(pathToFileURL(esmEntry).href)];
	return builds.map(settingsOf);
}

function esmEntryOf(manifest: unknown): string {
	const entry = isRecord(manifest) && isRecord(manifest.exports) && manifest.exports['.'];
	if (isRecord(entry) && typeof entry.import === 'string') return entry.import;
	throw new UnexpectedError('luxon declares no ESM entry');
}

function settingsOf(luxon: unknown): LuxonSettings {
	if (isRecord(luxon) && isLuxonSettings(luxon.Settings)) return luxon.Settings;
	throw new UnexpectedError('luxon exports no Settings');
}

function isLuxonSettings(value: unknown): value is LuxonSettings {
	return (
		typeof value === 'function' &&
		'now' in value &&
		typeof value.now === 'function' &&
		'defaultZone' in value
	);
}
