import type { Config } from '@oclif/core';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import Dev from './index';
import { runCommands, triggerReload } from './utils';
import { setupTestPackage } from '../../test-utils/package-setup';
import { tmpdirTest } from '../../test-utils/temp-fs';
import { detectContainerEngine } from '../../utils/container-engine';
import { createSymlink } from '../../utils/filesystem';
import { onCancel } from '../../utils/prompts';

vi.mock('./utils', async () => {
	const actual = await vi.importActual('./utils');
	return {
		...actual,
		runCommands: vi.fn(),
		createSpinner: vi.fn(() => vi.fn(() => 'spinner')),
		openUrl: vi.fn(),
		sleep: vi.fn(),
		createOpenN8nHandler: vi.fn(() => ({ key: 'o', handler: vi.fn() })),
		buildHelpText: vi.fn(() => 'Press q to quit | o to open n8n'),
		waitForN8n: vi.fn(async () => await Promise.resolve(true)),
		triggerReload: vi.fn(async () => await Promise.resolve(true)),
		watchStaticFiles: vi.fn(() => () => {}),
	};
});

vi.mock('../../utils/container-engine', () => ({
	detectContainerEngine: vi.fn(async () => await Promise.resolve('docker')),
	assertEngineRunning: vi.fn(async () => await Promise.resolve()),
	removeContainer: vi.fn(),
}));

vi.mock('../../utils/prompts', () => ({
	onCancel: vi.fn((_msg: string, code?: number) => {
		throw new Error(`EEXIT: ${code ?? 0}`);
	}),
	printCommandHeader: vi.fn(),
	getCommandHeader: vi.fn().mockResolvedValue('Command Header'),
}));

vi.mock('../../utils/filesystem', async () => {
	const actual = await vi.importActual('../../utils/filesystem');
	return {
		...actual,
		createSymlink: vi.fn(),
	};
});

describe('dev command', () => {
	const createMockConfig = (tmpdir: string): Config =>
		mock<Config>({
			root: tmpdir,
			runHook: async () => await Promise.resolve({ successes: [], failures: [] }),
		});

	const lastRunCommandsCall = () => vi.mocked(runCommands).mock.calls[0]?.[0];

	beforeEach(() => {
		vi.clearAllMocks();
	});

	tmpdirTest('runs n8n in a container by default, without a symlink', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		await new Dev([], createMockConfig(tmpdir)).run();

		expect(createSymlink).not.toHaveBeenCalled();
		expect(detectContainerEngine).toHaveBeenCalled();

		const commands = lastRunCommandsCall()?.commands;
		expect(commands).toHaveLength(2);
		expect(commands?.[0]?.name).toBe('TypeScript Build (watching)');

		const server = commands?.[1];
		expect(server?.cmd).toBe('docker');
		expect(server?.args).toContain('docker.n8n.io/n8nio/n8n:latest');
		expect(server?.args.join(' ')).toContain(
			`${tmpdir}:/home/node/.n8n/custom/node_modules/n8n-nodes-test`,
		);
		expect(server?.args).toContain('N8N_DEV_RELOAD=true');
	});

	tmpdirTest('--n8n-version selects the image tag', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		await new Dev(['--n8n-version', '2.20.7'], createMockConfig(tmpdir)).run();

		expect(lastRunCommandsCall()?.commands[1]?.args).toContain('docker.n8n.io/n8nio/n8n:2.20.7');
	});

	tmpdirTest('--n8n-image overrides --n8n-version', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		await new Dev(
			['--n8n-image', 'n8nio/n8n:local', '--n8n-version', '2.20.7'],
			createMockConfig(tmpdir),
		).run();

		const args = lastRunCommandsCall()?.commands[1]?.args;
		expect(args).toContain('n8nio/n8n:local');
		expect(args).not.toContain('docker.n8n.io/n8nio/n8n:2.20.7');
	});

	tmpdirTest('with --external-n8n only runs the watcher and symlinks', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		const customFolder = path.join(tmpdir, 'my-custom-folder');
		await new Dev(
			['--external-n8n', '--custom-user-folder', customFolder],
			createMockConfig(tmpdir),
		).run();

		expect(detectContainerEngine).not.toHaveBeenCalled();
		expect(lastRunCommandsCall()?.commands).toHaveLength(1);
		expect(vi.mocked(createSymlink).mock.calls[0]?.[1]).toBe(
			path.join(customFolder, '.n8n', 'custom', 'node_modules', 'n8n-nodes-test'),
		);
	});

	tmpdirTest('--external-n8n names the required N8N_USER_FOLDER', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		const customFolder = path.join(tmpdir, 'my-custom-folder');
		await new Dev(
			['--external-n8n', '--custom-user-folder', customFolder],
			createMockConfig(tmpdir),
		).run();

		expect(lastRunCommandsCall()?.headerText).toContain(`N8N_USER_FOLDER=${customFolder}`);
	});

	tmpdirTest('pushes a reload when the TypeScript build succeeds', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		await new Dev(['--external-n8n'], createMockConfig(tmpdir)).run();

		const tsc = lastRunCommandsCall()?.commands[0];
		tsc?.onOutput?.('Found 1 error. Watching for file changes.');
		expect(triggerReload).not.toHaveBeenCalled();

		tsc?.onOutput?.('Found 0 errors. Watching for file changes.');
		expect(triggerReload).toHaveBeenCalledWith('http://localhost:5678');
	});

	tmpdirTest('offers "o" to open n8n in external mode too', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });

		await new Dev(['--external-n8n'], createMockConfig(tmpdir)).run();

		expect(lastRunCommandsCall()?.keyHandlers).toHaveLength(1);
	});

	tmpdirTest('validates node name before doing anything', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'invalid-node-name' } });

		await expect(new Dev(['--external-n8n'], createMockConfig(tmpdir)).run()).rejects.toThrow(
			'EEXIT',
		);

		expect(onCancel).toHaveBeenCalled();
		expect(createSymlink).not.toHaveBeenCalled();
		expect(runCommands).not.toHaveBeenCalled();
	});

	tmpdirTest('fails with an actionable error when no engine is found', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, { packageJson: { name: 'n8n-nodes-test' } });
		vi.mocked(detectContainerEngine).mockRejectedValueOnce(
			new Error('No container engine found — n8n-node dev needs Docker or Podman.'),
		);

		await expect(new Dev([], createMockConfig(tmpdir)).run()).rejects.toThrow('EEXIT');

		expect(vi.mocked(onCancel).mock.calls[0]?.[0]).toContain('No container engine found');
		expect(runCommands).not.toHaveBeenCalled();
	});
});
