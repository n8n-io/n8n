import { join, resolve } from 'node:path';
import { fs as defaultFS, log } from '../dist/index.js';
export type * from '../dist/index.js';

const { ZENFS_LOG_LEVEL, SETUP } = process.env;

let level: log.Level | (typeof log.levels)[log.Level] = log.Level.CRIT;

if (ZENFS_LOG_LEVEL) {
	const tmp = parseInt(ZENFS_LOG_LEVEL);
	if (Number.isSafeInteger(tmp)) level = tmp;
	else level = ZENFS_LOG_LEVEL as (typeof log.levels)[log.Level];
}

log.configure({
	enabled: true,
	format: log.formats.ansi_message,
	dumpBacklog: true,
	level,
	output: console.error,
});

const setupPath = resolve(SETUP || join(import.meta.dirname, 'setup/memory.ts'));

const setup = await import(setupPath).catch(error => {
	console.log('Failed to import test setup:');
	throw error;
});

export const fs = (setup.fs || defaultFS) as typeof defaultFS;
