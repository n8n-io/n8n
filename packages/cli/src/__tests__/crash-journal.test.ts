import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { InstanceSettings } from 'n8n-core';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type CrashJournal = typeof import('@/crash-journal');

// The journal is only read and written when `inProduction` is true.
vi.mock('@n8n/backend-common', async () => ({
	...(await vi.importActual<typeof import('@n8n/backend-common')>('@n8n/backend-common')),
	inProduction: true,
}));

// `init()` pauses for 10 seconds when it sees a journal. Keep the mock so the
// test can assert on the delay without waiting for it.
vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn(async () => {}) }));

/**
 * CAT-4343: in a multi-main deployment the `main` instances share one
 * `N8N_USER_FOLDER` on a shared writable volume, so every process resolves the
 * same journal file. One process then reads a peer's live journal as a crash,
 * and one process's shutdown deletes a peer's journal.
 *
 * `N8N_CRASH_JOURNAL_PATH` must give each process its own journal, the same way
 * `N8N_EVENTBUS_LOGWRITER_LOGFULLPATH` does for the event log.
 *
 * These tests fail on current code: `crash-journal.ts` hardcodes the journal to
 * `join(n8nFolder, 'crash.journal')` and has no override.
 */
describe('crash journal on a shared user folder', () => {
	const logger = mockInstance(Logger);

	// The folder both `main` processes mount.
	const sharedFolder = Container.get(InstanceSettings).n8nFolder;
	// What a peer `main`, started seconds earlier, has already touched.
	const peerJournal = join(sharedFolder, 'crash.journal');
	// What this process must use instead.
	const ownJournal = join(sharedFolder, 'crash-main-2.journal');

	let crashJournal: CrashJournal;

	beforeAll(async () => {
		// The path is read when the module loads, so set it before the import.
		process.env.N8N_CRASH_JOURNAL_PATH = ownJournal;
		crashJournal = await import('@/crash-journal.js');
	});

	afterAll(() => {
		delete process.env.N8N_CRASH_JOURNAL_PATH;
		rmSync(peerJournal, { force: true });
		rmSync(ownJournal, { force: true });
	});

	beforeEach(() => {
		vi.clearAllMocks();
		rmSync(peerJournal, { force: true });
		rmSync(ownJournal, { force: true });
	});

	it('writes the journal to the configured path, not to the shared user folder', async () => {
		await crashJournal.init();

		expect(existsSync(ownJournal)).toBe(true);
		expect(existsSync(peerJournal)).toBe(false);
	});

	it('does not report a crash or delay start-up because a peer wrote its journal', async () => {
		writeFileSync(peerJournal, '');

		await crashJournal.init();

		expect(logger.error).not.toHaveBeenCalledWith('Last session crashed');
		expect(sleep).not.toHaveBeenCalled();
	});

	it('reports a crash when this process left its own journal behind', async () => {
		writeFileSync(ownJournal, '');

		await crashJournal.init();

		expect(logger.error).toHaveBeenCalledWith('Last session crashed');
	});

	it('removes only its own journal on shutdown', async () => {
		writeFileSync(peerJournal, '');

		await crashJournal.init();
		await crashJournal.cleanup();

		expect(existsSync(ownJournal)).toBe(false);
		expect(existsSync(peerJournal)).toBe(true);
	});
});
