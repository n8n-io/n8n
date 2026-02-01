import fs from 'node:fs/promises';

import { detectPackageManager, detectPackageManagerFromUserAgent } from './package-manager';
import { tmpdirTest } from '../test-utils/temp-fs';

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
		});

		tmpdirTest(
			'detects npm from package-lock.json when user agent is not available',
			async ({ tmpdir }) => {
				delete process.env.npm_config_user_agent;

				await fs.writeFile(`${tmpdir}/package-lock.json`, '{}');

				const result = await detectPackageManager();

				expect(result).toBe('npm');
			},
		);

		tmpdirTest(
			'detects yarn from yarn.lock when user agent is not available',
			async ({ tmpdir }) => {
				delete process.env.npm_config_user_agent;

				await fs.writeFile(`${tmpdir}/yarn.lock`, '');

				const result = await detectPackageManager();

				expect(result).toBe('yarn');
			},
		);

		tmpdirTest(
			'detects pnpm from pnpm-lock.yaml when user agent is not available',
			async ({ tmpdir }) => {
				delete process.env.npm_config_user_agent;

				await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, '');

				const result = await detectPackageManager();

				expect(result).toBe('pnpm');
			},
		);

		tmpdirTest('prioritizes npm lock file when multiple lock files exist', async ({ tmpdir }) => {
			delete process.env.npm_config_user_agent;

			await fs.writeFile(`${tmpdir}/package-lock.json`, '{}');
			await fs.writeFile(`${tmpdir}/yarn.lock`, '');
			await fs.writeFile(`${tmpdir}/pnpm-lock.yaml`, '');

			const result = await detectPackageManager();

			expect(result).toBe('npm');
		});

		tmpdirTest('returns null when no user agent and no lock files exist', async () => {
			delete process.env.npm_config_user_agent;

			const result = await detectPackageManager();

			expect(result).toBe(null);
		});

		tmpdirTest('ignores directories that match lock file names', async ({ tmpdir }) => {
			delete process.env.npm_config_user_agent;

			await fs.mkdir(`${tmpdir}/package-lock.json`);
			await fs.mkdir(`${tmpdir}/yarn.lock`);
			await fs.mkdir(`${tmpdir}/pnpm-lock.yaml`);

			const result = await detectPackageManager();

			expect(result).toBe(null);
		});
	});
});
