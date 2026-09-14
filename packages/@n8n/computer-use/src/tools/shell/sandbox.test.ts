import { SandboxManager } from '@anthropic-ai/sandbox-runtime';
import { spawn } from 'child_process';
import type { Mocked, MockedFunction } from 'vitest';

import { resetShellSandbox, resolveShellSandbox, spawnShell } from './sandbox';
import type { GatewayConfig } from '../../config';
import { getSettingsDir } from '../../config';
import { logger } from '../../logger';

vi.mock('@vscode/ripgrep', () => ({ rgPath: '/usr/bin/rg' }));
vi.mock('child_process');
vi.mock('@anthropic-ai/sandbox-runtime', () => ({
	['SandboxManager']: {
		isSupportedPlatform: vi.fn().mockReturnValue(true),
		checkDependencies: vi.fn().mockReturnValue({ errors: [], warnings: [] }),
		initialize: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn().mockResolvedValue(undefined),
		wrapWithSandbox: vi
			.fn()
			.mockImplementation(async (cmd: string) => await Promise.resolve(`sbx(${cmd})`)),
	},
}));
vi.mock('../../logger', () => ({
	logger: { warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockSandbox = SandboxManager as Mocked<typeof SandboxManager>;
const mockSpawn = spawn as MockedFunction<typeof spawn>;

function makeConfig(dangerouslyDisableSandbox = false): GatewayConfig {
	return {
		logLevel: 'silent',
		allowedOrigins: [],
		filesystem: { dir: '/work' },
		computer: { shell: { timeout: 30_000, dangerouslyDisableSandbox } },
		browser: { defaultBrowser: 'chrome' },
		permissions: {},
		permissionConfirmation: 'client',
	};
}

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
function setPlatform(value: NodeJS.Platform) {
	Object.defineProperty(process, 'platform', { value, configurable: true });
}

afterEach(() => {
	vi.clearAllMocks();
	Object.defineProperty(process, 'platform', originalPlatform);
	mockSandbox.isSupportedPlatform.mockReturnValue(true);
	mockSandbox.checkDependencies.mockReturnValue({ errors: [], warnings: [] });
	mockSandbox.initialize.mockResolvedValue(undefined);
});

describe('resolveShellSandbox', () => {
	it('enables the sandbox on macOS without extra dependencies', async () => {
		setPlatform('darwin');

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status).toEqual({ enabled: true, mode: 'sandboxed' });
		expect(mockSandbox.initialize).toHaveBeenCalledTimes(1);
	});

	it('enables the sandbox on Linux when dependencies are present', async () => {
		setPlatform('linux');

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status).toEqual({ enabled: true, mode: 'sandboxed' });
		expect(mockSandbox.checkDependencies).toHaveBeenCalled();
		expect(mockSandbox.initialize).toHaveBeenCalledTimes(1);
	});

	it('initializes with ~/.ssh and the settings dir denied, and the working dir writable', async () => {
		setPlatform('linux');

		await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		const config = mockSandbox.initialize.mock.calls[0][0];
		expect(config.filesystem?.denyRead).toEqual(
			expect.arrayContaining(['~/.ssh', getSettingsDir()]),
		);
		expect(config.filesystem?.denyWrite).toContain(getSettingsDir());
		expect(config.filesystem?.allowWrite).toEqual(['/work']);
		expect(config.ripgrep?.command).toBe('/usr/bin/rg');
	});

	it('disables the sandbox (fail closed) when Linux dependencies are missing', async () => {
		setPlatform('linux');
		mockSandbox.checkDependencies.mockReturnValue({
			errors: ['bubblewrap (bwrap) not installed'],
			warnings: [],
		});

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status.enabled).toBe(false);
		if (!status.enabled) expect(status.reason).toContain('bubblewrap');
		expect(mockSandbox.initialize).not.toHaveBeenCalled();
	});

	it('disables the sandbox on native Windows', async () => {
		setPlatform('win32');

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status.enabled).toBe(false);
		if (!status.enabled) expect(status.reason).toContain('Windows');
		expect(mockSandbox.initialize).not.toHaveBeenCalled();
		expect(mockSandbox.checkDependencies).not.toHaveBeenCalled();
	});

	it('disables the sandbox on unsupported platforms (e.g. WSL1)', async () => {
		setPlatform('linux');
		mockSandbox.isSupportedPlatform.mockReturnValue(false);

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status.enabled).toBe(false);
		expect(mockSandbox.initialize).not.toHaveBeenCalled();
	});

	it('disables the sandbox (fail closed) when initialization throws', async () => {
		setPlatform('linux');
		mockSandbox.initialize.mockRejectedValue(new Error('bwrap: user namespaces disabled'));

		const status = await resolveShellSandbox({ config: makeConfig(), dir: '/work' });

		expect(status.enabled).toBe(false);
		if (!status.enabled) expect(status.reason).toContain('initialize');
	});

	describe('explicit opt-out (--dangerously-disable-shell-sandbox)', () => {
		it('runs unsandboxed and warns, without checking deps or initializing', async () => {
			setPlatform('linux');

			const status = await resolveShellSandbox({ config: makeConfig(true), dir: '/work' });

			expect(status).toEqual({ enabled: true, mode: 'unsandboxed' });
			expect(mockSandbox.checkDependencies).not.toHaveBeenCalled();
			expect(mockSandbox.initialize).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('--dangerously-disable-shell-sandbox'),
			);
		});

		it('opts out even on native Windows', async () => {
			setPlatform('win32');

			const status = await resolveShellSandbox({ config: makeConfig(true), dir: '/work' });

			expect(status).toEqual({ enabled: true, mode: 'unsandboxed' });
		});
	});
});

describe('spawnShell', () => {
	it('wraps the command with the sandbox when sandboxed', async () => {
		await spawnShell('cat /etc/passwd', { cwd: '/work', mode: 'sandboxed' });

		expect(mockSandbox.wrapWithSandbox).toHaveBeenCalledWith('cat /etc/passwd');
		const [executable, options] = mockSpawn.mock.calls[0];
		expect(executable).toBe('sbx(cat /etc/passwd)');
		expect(options).toMatchObject({ shell: true, cwd: '/work' });
	});

	it('fails closed (never spawns) when the sandbox wrap throws', async () => {
		mockSandbox.wrapWithSandbox.mockRejectedValue(new Error('bwrap: user namespaces disabled'));

		await expect(spawnShell('cat /etc/passwd', { mode: 'sandboxed' })).rejects.toThrow('bwrap');
		expect(mockSpawn).not.toHaveBeenCalled();
	});

	it('runs bare sh on non-Windows when unsandboxed', async () => {
		setPlatform('linux');

		await spawnShell('id', { cwd: '/work', mode: 'unsandboxed' });

		expect(mockSandbox.wrapWithSandbox).not.toHaveBeenCalled();
		const [executable, args] = mockSpawn.mock.calls[0];
		expect(executable).toBe('sh');
		expect(args).toEqual(['-c', 'id']);
	});

	it('runs cmd.exe on Windows when unsandboxed', async () => {
		setPlatform('win32');

		await spawnShell('dir', { mode: 'unsandboxed' });

		const [executable, args] = mockSpawn.mock.calls[0];
		expect(executable).toBe('cmd.exe');
		expect(args).toEqual(['/C', 'dir']);
	});
});

describe('resetShellSandbox', () => {
	it('tears down the sandbox', async () => {
		await resetShellSandbox();

		expect(mockSandbox.reset).toHaveBeenCalledTimes(1);
	});
});
