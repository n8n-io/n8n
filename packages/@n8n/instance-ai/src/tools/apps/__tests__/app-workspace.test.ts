import type { Workspace } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { InstanceAiAppService } from '../../../types';
import {
	readFileViaSandbox,
	runInSandbox,
	writeFileViaSandbox,
} from '../../../workspace/sandbox-fs';
import { checkOutDraft, packAppFolder, readBaseVersion } from '../app-workspace';

vi.mock('@n8n/agents/sandbox', () => ({ getWorkspaceRoot: async () => '/home/user/workspace' }));
vi.mock('../../../workspace/sandbox-fs', async (importOriginal) => ({
	...(await importOriginal<object>()),
	readFileViaSandbox: vi.fn(),
	runInSandbox: vi.fn(),
	writeFileViaSandbox: vi.fn(),
}));

const APP_ID = '0190a5d2-6f4b-7c3e-8a1d-2b3c4d5e6f70';
const DIR = `/home/user/workspace/apps/${APP_ID}`;
const workspace = mock<Workspace>({ filesystem: { readFile: vi.fn() } });

describe('app workspace', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(runInSandbox).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
	});

	it('replaces the app folder with the draft and records its base version', async () => {
		const apps = mock<InstanceAiAppService>();
		const archive = Buffer.from('archive');
		apps.exportDraft.mockResolvedValue({ baseVersionId: 'v1', archive });

		expect(await checkOutDraft(workspace, apps, APP_ID)).toBe('v1');

		expect(writeFileViaSandbox).toHaveBeenCalledWith(workspace, `${DIR}.tgz`, archive);
		const [, command] = vi.mocked(runInSandbox).mock.calls[0];
		expect(command).toContain(
			`find '${DIR}' -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +`,
		);
		expect(command).toContain(`tar -xzf '${DIR}.tgz' --no-same-owner -C '${DIR}'`);
		expect(writeFileViaSandbox).toHaveBeenCalledWith(workspace, `${DIR}.base-version`, 'v1');
	});

	it('packs the folder without dependencies and build output and reads the archive as a file', async () => {
		vi.mocked(workspace.filesystem!.readFile).mockResolvedValue(Buffer.from('archive'));

		expect(await packAppFolder(workspace, APP_ID)).toEqual(Buffer.from('archive'));

		expect(workspace.filesystem!.readFile).toHaveBeenCalledWith(`${DIR}.tgz`);
		const commands = vi.mocked(runInSandbox).mock.calls.map(([, command]) => command);
		expect(commands[0]).toContain('--exclude=./node_modules --exclude=./dist');
		expect(commands[0]).toContain(`-C '${DIR}' .`);
		expect(commands[1]).toBe(`rm -f '${DIR}.tgz'`);
	});

	it('removes the archive when it cannot be read', async () => {
		vi.mocked(workspace.filesystem!.readFile).mockRejectedValue(new Error('Not found'));

		await expect(packAppFolder(workspace, APP_ID)).rejects.toThrow('Not found');

		expect(vi.mocked(runInSandbox).mock.calls.at(-1)?.[1]).toBe(`rm -f '${DIR}.tgz'`);
	});

	it('fails when a sandbox command fails', async () => {
		vi.mocked(runInSandbox).mockResolvedValue({ exitCode: 2, stdout: '', stderr: 'tar: error' });

		await expect(packAppFolder(workspace, APP_ID)).rejects.toThrow(
			'Sandbox command failed: tar: error',
		);
	});

	it.each([
		{ content: null, expected: undefined },
		{ content: '', expected: null },
		{ content: 'v1\n', expected: 'v1' },
	])('reads the base version $expected from $content', async ({ content, expected }) => {
		vi.mocked(readFileViaSandbox).mockResolvedValue(content);

		expect(await readBaseVersion(workspace, APP_ID)).toBe(expected);
	});
});
