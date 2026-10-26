import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { existsSync } from 'fs';
import { mkdir, readdir, rm, utimes } from 'fs/promises';

// Hoisted so the assertions can reach the spy without importing the mocked
// module here, which would run the factory below before `@n8n/di` initialises.
const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));

// `inProduction` is derived from NODE_ENV at import time, which is `test` here,
// so force it on — otherwise `init()` bails before reaching the guard under test.
vi.mock('@n8n/backend-common', () => {
	@Service()
	class Logger {
		error = loggerError;
	}

	return { inProduction: true, Logger };
});

vi.mock('n8n-core', () => {
	@Service()
	class InstanceSettings {
		n8nFolder = '/tmp/n8n-crash-journal-test';
	}

	return { InstanceSettings };
});

vi.mock('fs');
vi.mock('fs/promises');
vi.mock('@n8n/utils/sleep');

import {
	cleanup,
	init,
	markResumeEnded,
	markResumeStarted,
	readInterruptedResumes,
} from '../crash-journal';

describe('crash journal init()', () => {
	const originalDevReload = process.env.N8N_DEV_RELOAD;

	beforeEach(() => {
		vi.mocked(existsSync).mockReturnValue(true); // a journal from a previous session
	});

	afterEach(() => {
		if (originalDevReload === undefined) delete process.env.N8N_DEV_RELOAD;
		else process.env.N8N_DEV_RELOAD = originalDevReload;
		vi.clearAllMocks();
	});

	it('skips the crash-loop pause and the journal write when N8N_DEV_RELOAD is enabled', async () => {
		process.env.N8N_DEV_RELOAD = 'true';

		await init();

		expect(sleep).not.toHaveBeenCalled();
		expect(mkdir).not.toHaveBeenCalled();
		expect(utimes).not.toHaveBeenCalled();
		expect(loggerError).not.toHaveBeenCalled();
	});

	it('pauses and rewrites the journal when N8N_DEV_RELOAD is not set', async () => {
		delete process.env.N8N_DEV_RELOAD;

		await init();

		expect(loggerError).toHaveBeenCalledWith('Last session crashed');
		expect(sleep).toHaveBeenCalledWith(10_000);
		expect(utimes).toHaveBeenCalled();
	});
});

describe('crash journal resumes', () => {
	const resumesFolder = '/tmp/n8n-crash-journal-test/crash.journal.resumes';

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('writes and removes one entry per resumed execution', async () => {
		await markResumeStarted('123');
		expect(utimes).toHaveBeenCalledWith(`${resumesFolder}/123`, expect.any(Date), expect.any(Date));

		await markResumeEnded('123');
		expect(rm).toHaveBeenCalledWith(`${resumesFolder}/123`, { force: true });
	});

	it('returns the interrupted resumes after a crash, without removing them', async () => {
		vi.mocked(existsSync).mockReturnValue(true);
		await init();
		vi.mocked(readdir).mockResolvedValue(['123'] as never);

		expect(await readInterruptedResumes()).toEqual(['123']);
		expect(rm).not.toHaveBeenCalled();
	});

	it('discards the resumes when the last session did not crash', async () => {
		vi.mocked(existsSync).mockReturnValueOnce(false).mockReturnValue(true);
		await init();

		expect(await readInterruptedResumes()).toEqual([]);
		expect(readdir).not.toHaveBeenCalled();
		expect(rm).toHaveBeenCalledWith(resumesFolder, { recursive: true, force: true });
	});

	it('returns no resumes when they cannot be read', async () => {
		vi.mocked(existsSync).mockReturnValue(true);
		await init();
		vi.mocked(readdir).mockRejectedValue(new Error('EIO'));

		expect(await readInterruptedResumes()).toEqual([]);
	});

	it('removes the resumes on a clean shutdown', async () => {
		await cleanup();

		expect(rm).toHaveBeenCalledWith(resumesFolder, { recursive: true, force: true });
	});
});
