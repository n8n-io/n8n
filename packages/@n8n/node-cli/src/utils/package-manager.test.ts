import type { Stats } from 'node:fs';
import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { detectPackageManager, detectPackageManagerFromUserAgent } from './package-manager';

// Mock dependencies
vi.mock('node:child_process');
vi.mock('node:fs/promises');
vi.mock('@clack/prompts');

describe('package manager utils', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('detectPackageManagerFromUserAgent', () => {
		it('returns pnpm when user agent contains pnpm', () => {
			process.env.npm_config_user_agent = 'pnpm/8.6.0 npm/? node/v18.16.0 darwin x64';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe('pnpm');
		});

		it('returns yarn when user agent contains yarn', () => {
			process.env.npm_config_user_agent = 'yarn/1.22.19 npm/? node/v18.16.0 darwin x64';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe('yarn');
		});

		it('returns npm when user agent contains npm', () => {
			process.env.npm_config_user_agent = 'npm/9.5.1 node/v18.16.0 darwin x64 workspaces/false';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe('npm');
		});

		it('prioritizes pnpm over yarn and npm when multiple are present', () => {
			process.env.npm_config_user_agent = 'pnpm/8.6.0 yarn/1.22.19 npm/9.5.1 node/v18.16.0';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe('pnpm');
		});

		it('prioritizes yarn over npm when both are present but no pnpm', () => {
			process.env.npm_config_user_agent = 'yarn/1.22.19 npm/9.5.1 node/v18.16.0';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe('yarn');
		});

		it('returns null when npm_config_user_agent is not set', () => {
			delete process.env.npm_config_user_agent;

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe(null);
		});

		it('returns null when user agent does not contain any package manager', () => {
			process.env.npm_config_user_agent = 'node/v18.16.0 darwin x64';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe(null);
		});

		it('returns null when user agent is empty string', () => {
			process.env.npm_config_user_agent = '';

			const result = detectPackageManagerFromUserAgent();

			expect(result).toBe(null);
		});
	});

	describe('detectPackageManager', () => {
		it('returns package manager from user agent when available', async () => {
			process.env.npm_config_user_agent = 'pnpm/8.6.0 npm/? node/v18.16.0';

			const result = await detectPackageManager();

			expect(result).toBe('pnpm');
			expect(vi.mocked(fs).stat).not.toHaveBeenCalled();
		});

		it('detects npm from package-lock.json when user agent is not available', async () => {
			delete process.env.npm_config_user_agent;

			vi.mocked(fs).stat.mockImplementation(async (path) => {
				if (path === 'package-lock.json') {
					const stats = mock<Stats>();
					stats.isFile.mockReturnValue(true);
					return await Promise.resolve(stats);
				}
				throw new Error('File not found');
			});

			const result = await detectPackageManager();

			expect(result).toBe('npm');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('package-lock.json');
		});

		it('detects yarn from yarn.lock when user agent is not available', async () => {
			delete process.env.npm_config_user_agent;

			vi.mocked(fs).stat.mockImplementation(async (path) => {
				if (path === 'yarn.lock') {
					const stats = mock<Stats>();
					stats.isFile.mockReturnValue(true);
					return await Promise.resolve(stats);
				}
				throw new Error('File not found');
			});

			const result = await detectPackageManager();

			expect(result).toBe('yarn');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('package-lock.json');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('yarn.lock');
		});

		it('detects pnpm from pnpm-lock.yaml when user agent is not available', async () => {
			delete process.env.npm_config_user_agent;

			vi.mocked(fs).stat.mockImplementation(async (path) => {
				if (path === 'pnpm-lock.yaml') {
					const stats = mock<Stats>();
					stats.isFile.mockReturnValue(true);
					return await Promise.resolve(stats);
				}
				throw new Error('File not found');
			});

			const result = await detectPackageManager();

			expect(result).toBe('pnpm');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('package-lock.json');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('yarn.lock');
			expect(vi.mocked(fs).stat).toHaveBeenCalledWith('pnpm-lock.yaml');
		});

		it('prioritizes npm lock file when multiple lock files exist', async () => {
			delete process.env.npm_config_user_agent;

			const stats = mock<Stats>();
			stats.isFile.mockReturnValue(true);
			vi.mocked(fs).stat.mockResolvedValue(stats);

			const result = await detectPackageManager();

			expect(result).toBe('npm');
		});

		it('returns null when no user agent and no lock files exist', async () => {
			delete process.env.npm_config_user_agent;
			vi.mocked(fs).stat.mockRejectedValue(new Error('File not found'));

			const result = await detectPackageManager();

			expect(result).toBe(null);
		});

		it('ignores directories that match lock file names', async () => {
			delete process.env.npm_config_user_agent;

			vi.mocked(fs).stat.mockImplementation(async (path) => {
				if (path === 'package-lock.json') {
					const stats = mock<Stats>();
					stats.isFile.mockReturnValue(false);
					return await Promise.resolve(stats);
				}
				throw new Error('File not found');
			});

			const result = await detectPackageManager();

			expect(result).toBe(null);
		});
	});
});
