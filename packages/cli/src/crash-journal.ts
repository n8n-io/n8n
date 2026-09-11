import { inProduction, Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { existsSync } from 'fs';
import { mkdir, utimes, open, rm } from 'fs/promises';
import { sleep } from '@n8n/utils/sleep';
import { InstanceSettings } from 'n8n-core';
import { join, dirname } from 'path';

export const touchFile = async (filePath: string): Promise<void> => {
	await mkdir(dirname(filePath), { recursive: true });
	const time = new Date();
	try {
		await utimes(filePath, time, time);
	} catch {
		const fd = await open(filePath, 'w');
		await fd.close();
	}
};

const { n8nFolder } = Container.get(InstanceSettings);

/**
 * `N8N_CRASH_JOURNAL_PATH` is the absolute path to the journal of this process.
 * Set it when several processes share one `N8N_USER_FOLDER` on a writable
 * volume, because each process needs its own journal: processes that share one
 * journal report a crash that did not happen, and the shutdown of one process
 * removes the journal of another process. The orchestrator owns the uniqueness,
 * the same way it does for `N8N_EVENTBUS_LOGWRITER_LOGFULLPATH`. The parent
 * directory is created if it is missing. Empty (default) keeps
 * `${N8N_USER_FOLDER}/crash.journal`.
 */
const journalFile = process.env.N8N_CRASH_JOURNAL_PATH || join(n8nFolder, 'crash.journal');

export const init = async () => {
	if (!inProduction) return;

	if (existsSync(journalFile)) {
		// Crash detected
		Container.get(Logger).error('Last session crashed');
		// add a 10 seconds pause to slow down crash-looping
		await sleep(10_000);
	}
	await touchFile(journalFile);
};

export const cleanup = async () => {
	await rm(journalFile, { force: true });
};
