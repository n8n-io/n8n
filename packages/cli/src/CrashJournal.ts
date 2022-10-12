import moment from 'moment';
import { UserSettings } from 'n8n-core';
import { join } from 'node:path';
import { createWriteStream, existsSync, WriteStream } from 'node:fs';
import { rm, readFile } from 'node:fs/promises';

type JournalKey = 'starting' | 'loading' | 'executing';
type JournalEntry = [number, JournalKey, ...string[]];

let journalStream: WriteStream;
const journalFile = join(UserSettings.getUserN8nFolderPath(), 'crash.journal');

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CrashJournal = {
	async init() {
		if (existsSync(journalFile)) {
			const entries = (await readFile(journalFile, { encoding: 'utf-8' }))
				.split('\n')
				.filter((line) => line.startsWith('[') && line.endsWith(']'))
				.map((line) => JSON.parse(line) as JournalEntry);

			if (entries.length) {
				// Crash detected
				const startAttempts = entries.filter((entry) => entry[1] === 'starting');
				console.log(
					'Crashed %d times in the last %s',
					startAttempts.length,
					moment(startAttempts[0][0]).fromNow(true),
				);
				const lastEntry = entries.slice(-1)[0].slice(1).join(' ');
				console.log('Last operation before the last crash was:', lastEntry);

				// TODO: Detect reason for the last crash
				// TODO: Report the issue

				// add a 10 seconds pause to slow down crash-looping
				await new Promise((resolve) => setTimeout(resolve, 10_000));
			}
		}

		journalStream = createWriteStream(journalFile, { autoClose: true, flags: 'a' });
	},

	entry(key: JournalKey, ...args: string[]) {
		const entry: JournalEntry = [Date.now(), key, ...args];
		journalStream.write(JSON.stringify(entry) + '\n');
	},

	async cleanup() {
		await rm(journalFile, { force: true });
	},
};
