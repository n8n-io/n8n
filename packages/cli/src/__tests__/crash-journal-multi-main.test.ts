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

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn(async () => {}) }));

describe('crash journal on a shared user folder', () => {
	const logger = mockInstance(Logger);

	const sharedFolder = Container.get(InstanceSettings).n8nFolder;
	const peerJournal = join(sharedFolder, 'crash.journal');
	const ownJournal = join(sharedFolder, 'crash-main-2.journal');

	let crashJournal: CrashJournal;

	beforeAll(async () => {
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
		expect(sleep).toHaveBeenCalledWith(10_000);
	});

	it('removes only its own journal on shutdown', async () => {
		writeFileSync(peerJournal, '');

		await crashJournal.init();
		await crashJournal.cleanup();

		expect(existsSync(ownJournal)).toBe(false);
		expect(existsSync(peerJournal)).toBe(true);
	});
});
