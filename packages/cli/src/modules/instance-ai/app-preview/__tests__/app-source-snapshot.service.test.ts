import type { Workspace } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { App } from '@/modules/apps/app.entity';
import type { AppRepository } from '@/modules/apps/app.repository';
import type { AppsService } from '@/modules/apps/apps.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import {
	AppSourceSnapshotService,
	buildSnapshotScript,
	LIST_APPS_SCRIPT,
} from '../app-source-snapshot.service';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/user/workspace')),
}));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const ROOT = '/home/user/workspace';
const USER = mock<User>({ id: 'user-1' });
const APP = { id: 'app-1', namespace: 'greeter', projectId: 'proj-1' } as App;
const TARBALL = Buffer.from([0x1f, 0x8b, 0x08, 0x00]);

const ok = (stdout = '') => ({
	exitCode: 0,
	stdout,
	stderr: '',
	success: true,
	executionTimeMs: 1,
});
const fail = (stdout = '', exitCode = 1) => ({
	exitCode,
	stdout,
	stderr: '',
	success: false,
	executionTimeMs: 1,
});

function createService() {
	const appsService = mock<AppsService>();
	const appRepository = mock<AppRepository>();
	const executeCommand = vi.fn();
	const readFile = vi.fn().mockResolvedValue(TARBALL);
	const workspace = {
		sandbox: { id: 'sb', name: 'sb', provider: 'n8n-sandbox', status: 'ready', executeCommand },
		filesystem: { id: 'fs', readFile },
	} as unknown as Workspace;
	const service = new AppSourceSnapshotService(appsService, appRepository, mockLogger());
	appRepository.findByNamespace.mockResolvedValue(APP);
	appsService.createSourceSnapshot.mockResolvedValue({
		id: 'snap-1',
		appId: 'app-1',
		createdAt: '2026-09-09T00:00:00.000Z',
		hasDist: false,
		isActive: false,
		kind: 'snapshot',
	});
	vi.mocked(userHasScopes).mockResolvedValue(true);
	return { service, appsService, appRepository, executeCommand, readFile, workspace };
}

/** Default sandbox: one app `greeter` whose snapshot script produces a 4-byte tarball. */
function mockSandboxWithApp(executeCommand: ReturnType<typeof vi.fn>, hash = 'abc') {
	executeCommand.mockImplementation(async (command: string) => {
		if (command === LIST_APPS_SCRIPT) return await Promise.resolve(ok('greeter\n'));
		if (command.includes('tar -czf')) return await Promise.resolve(ok(`SNAPSHOT ${hash} 4\n`));
		return await Promise.resolve(ok());
	});
}

describe('buildSnapshotScript', () => {
	it('hashes the app, skips when unchanged, and packs into the workspace staging dir', () => {
		const script = buildSnapshotScript({
			root: ROOT,
			namespace: 'greeter',
			tarball: '.app-builds/greeter-1-snapshot.tgz',
			lastHash: 'abc',
		});

		expect(script).toContain(`cd '${ROOT}/apps/greeter'`);
		expect(script).toContain(
			'tar -cf - --exclude=node_modules --exclude=dist --exclude=.git --exclude=.n8n-dev.log --exclude=.n8n-dev.pid . | (sha256sum 2>/dev/null || cksum)',
		);
		expect(script).toContain('if [ "$hash" = \'abc\' ]; then echo UNCHANGED; exit 0; fi');
		expect(script).toContain(
			`tar -czf '${ROOT}/.app-builds/greeter-1-snapshot.tgz' --exclude=node_modules --exclude=dist --exclude=.git --exclude=.n8n-dev.log --exclude=.n8n-dev.pid .`,
		);
		expect(script).toContain('echo "SNAPSHOT $hash $(stat -c %s');
	});
});

describe('AppSourceSnapshotService', () => {
	it('stores a snapshot for each app directory that has a package.json', async () => {
		const { service, appsService, executeCommand, readFile, workspace } = createService();
		mockSandboxWithApp(executeCommand);

		await service.snapshotAfterRun('thread-1', USER, workspace);

		expect(executeCommand.mock.calls[0][0]).toBe(LIST_APPS_SCRIPT);
		expect(executeCommand.mock.calls[1][0]).toContain(`cd '${ROOT}/apps/greeter'`);
		expect(executeCommand.mock.calls[1][2]).toMatchObject({ cwd: ROOT, timeout: 60_000 });
		// The scoped filesystem resolves the root-relative staging path before delegating.
		expect(readFile).toHaveBeenCalledWith(
			expect.stringMatching(/^\/home\/user\/workspace\/\.app-builds\/greeter-\d+-snapshot\.tgz$/),
			undefined,
		);
		expect(userHasScopes).toHaveBeenCalledWith(USER, ['app:update'], false, {
			projectId: 'proj-1',
		});
		expect(appsService.createSourceSnapshot).toHaveBeenCalledWith('app-1', TARBALL);
		expect(String(executeCommand.mock.calls.at(-1)?.[0])).toMatch(
			/^rm -f '\/home\/user\/workspace\/\.app-builds\/greeter-\d+-snapshot\.tgz'$/,
		);
	});

	it('skips the next turn when the source hash is unchanged, until the thread is cleared', async () => {
		const { service, appsService, executeCommand, workspace } = createService();
		mockSandboxWithApp(executeCommand, 'h1');
		await service.snapshotAfterRun('thread-1', USER, workspace);

		executeCommand.mockImplementation(async (command: string) => {
			if (command === LIST_APPS_SCRIPT) return await Promise.resolve(ok('greeter\n'));
			if (command.includes('if [ "$hash" = \'h1\' ]'))
				return await Promise.resolve(ok('UNCHANGED\n'));
			return await Promise.resolve(ok('SNAPSHOT h1 4\n'));
		});
		await service.snapshotAfterRun('thread-1', USER, workspace);
		expect(appsService.createSourceSnapshot).toHaveBeenCalledTimes(1);

		service.clearThread('thread-1');
		await service.snapshotAfterRun('thread-1', USER, workspace);
		expect(appsService.createSourceSnapshot).toHaveBeenCalledTimes(2);
		expect(executeCommand.mock.calls.at(-2)?.[0]).toContain('if [ "$hash" = \'\' ]');
	});

	it('does nothing when the sandbox has no app directory', async () => {
		const { service, appsService, appRepository, executeCommand, workspace } = createService();
		executeCommand.mockResolvedValue(ok(''));

		await service.snapshotAfterRun('thread-1', USER, workspace);

		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(appRepository.findByNamespace).not.toHaveBeenCalled();
		expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
	});

	it('skips a namespace with no app, or one the user may not update', async () => {
		const { service, appsService, appRepository, executeCommand, workspace } = createService();
		mockSandboxWithApp(executeCommand);

		appRepository.findByNamespace.mockResolvedValue(null);
		await service.snapshotAfterRun('thread-1', USER, workspace);

		appRepository.findByNamespace.mockResolvedValue(APP);
		vi.mocked(userHasScopes).mockResolvedValue(false);
		await service.snapshotAfterRun('thread-1', USER, workspace);

		expect(executeCommand).toHaveBeenCalledTimes(2);
		expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
	});

	it('stores nothing and removes the tarball when the script fails or the read-out is not binary', async () => {
		const { service, appsService, executeCommand, readFile, workspace } = createService();
		executeCommand.mockImplementation(async (command: string) => {
			if (command === LIST_APPS_SCRIPT) return await Promise.resolve(ok('greeter\n'));
			if (command.includes('tar -czf')) return await Promise.resolve(fail('tar: error'));
			return await Promise.resolve(ok());
		});
		await service.snapshotAfterRun('thread-1', USER, workspace);
		expect(readFile).not.toHaveBeenCalled();
		expect(String(executeCommand.mock.calls.at(-1)?.[0])).toMatch(/^rm -f /);

		mockSandboxWithApp(executeCommand);
		readFile.mockResolvedValue('text');
		await service.snapshotAfterRun('thread-1', USER, workspace);

		expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
	});

	it('skips a tarball over the upload limit', async () => {
		const { service, appsService, executeCommand, readFile, workspace } = createService();
		executeCommand.mockImplementation(async (command: string) => {
			if (command === LIST_APPS_SCRIPT) return await Promise.resolve(ok('greeter\n'));
			if (command.includes('tar -czf'))
				return await Promise.resolve(ok(`SNAPSHOT abc ${20 * 1024 * 1024 + 1}\n`));
			return await Promise.resolve(ok());
		});

		await service.snapshotAfterRun('thread-1', USER, workspace);

		expect(readFile).not.toHaveBeenCalled();
		expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
	});

	it('propagates a storage failure to the caller, after removing the tarball', async () => {
		const { service, appsService, executeCommand, workspace } = createService();
		mockSandboxWithApp(executeCommand);
		appsService.createSourceSnapshot.mockRejectedValue(new Error('db down'));

		await expect(service.snapshotAfterRun('thread-1', USER, workspace)).rejects.toThrow('db down');

		expect(String(executeCommand.mock.calls.at(-1)?.[0])).toMatch(/^rm -f /);
	});
});
