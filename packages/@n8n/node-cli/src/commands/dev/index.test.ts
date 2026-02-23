import type { Config } from '@oclif/core';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import Dev from './index';
import { runCommands } from './utils';
import { setupTestPackage } from '../../test-utils/package-setup';
import { tmpdirTest } from '../../test-utils/temp-fs';
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
	};
});

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

	beforeEach(() => {
		vi.clearAllMocks();
	});

	tmpdirTest(
		'creates symlink and starts TypeScript watcher with external-n8n flag',
		async ({ tmpdir }) => {
			await setupTestPackage(tmpdir, {
				packageJson: { name: 'n8n-nodes-test' },
			});

			const command = new Dev(['--external-n8n'], createMockConfig(tmpdir));
			await command.run();

			expect(createSymlink).toHaveBeenCalled();
			expect(runCommands).toHaveBeenCalled();

			const calls = vi.mocked(runCommands).mock.calls[0]?.[0];
			expect(calls?.commands).toHaveLength(1);
			expect(calls?.commands[0]?.name).toBe('TypeScript Build (watching)');
		},
	);

	tmpdirTest('starts both TypeScript watcher and n8n server by default', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const command = new Dev([], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(runCommands).mock.calls[0]?.[0];
		expect(calls?.commands).toHaveLength(2);
		expect(calls?.commands[0]?.name).toBe('TypeScript Build (watching)');
		expect(calls?.commands[1]?.name).toBe('n8n Server');
	});

	tmpdirTest('creates symlink in default custom folder location', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const command = new Dev(['--external-n8n'], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(createSymlink).mock.calls[0];
		expect(calls?.[0]).toContain(tmpdir.split('/').pop());
		expect(calls?.[1]).toContain('.n8n-node-cli');
		expect(calls?.[1]).toContain('node_modules/n8n-nodes-test');
	});

	tmpdirTest('creates symlink in custom folder when specified', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const customFolder = path.join(tmpdir, 'my-custom-folder');
		const command = new Dev(['--custom-user-folder', customFolder], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(createSymlink).mock.calls[0];
		expect(calls?.[0]).toContain(tmpdir.split('/').pop());
		expect(calls?.[1]).toBe(
			path.join(customFolder, '.n8n', 'custom', 'node_modules', 'n8n-nodes-test'),
		);
	});

	tmpdirTest('validates node name before creating symlink', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'invalid-node-name' },
		});

		const command = new Dev(['--external-n8n'], createMockConfig(tmpdir));

		await expect(command.run()).rejects.toThrow('EEXIT');

		expect(onCancel).toHaveBeenCalled();
		expect(createSymlink).not.toHaveBeenCalled();
		expect(runCommands).not.toHaveBeenCalled();
	});

	tmpdirTest('passes correct environment to n8n server', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const customFolder = path.join(tmpdir, 'custom');
		const command = new Dev(['--custom-user-folder', customFolder], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(runCommands).mock.calls[0]?.[0];
		const n8nCommand = calls?.commands.find((c) => c.name === 'n8n Server');

		expect(n8nCommand).toBeDefined();
		expect(n8nCommand?.env).toMatchObject({
			N8N_DEV_RELOAD: 'true',
			N8N_RUNNERS_ENABLED: 'true',
			N8N_USER_FOLDER: customFolder,
		});
	});

	tmpdirTest('includes open n8n key handler when n8n is enabled', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const command = new Dev([], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(runCommands).mock.calls[0]?.[0];
		expect(calls?.keyHandlers).toBeDefined();
		expect(calls?.keyHandlers).toHaveLength(1);
		expect(calls?.keyHandlers?.[0]?.key).toBe('o');
	});

	tmpdirTest('includes no key handlers with external-n8n flag', async ({ tmpdir }) => {
		await setupTestPackage(tmpdir, {
			packageJson: { name: 'n8n-nodes-test' },
		});

		const command = new Dev(['--external-n8n'], createMockConfig(tmpdir));
		await command.run();

		const calls = vi.mocked(runCommands).mock.calls[0]?.[0];
		expect(calls?.keyHandlers).toBeDefined();
		expect(calls?.keyHandlers).toHaveLength(0);
	});
});
