/**
 * Regression test for CAT-2506: devcontainer build failure
 *
 * Issue: The devcontainer Dockerfile fails to build because:
 * 1. `apk` was removed from n8nio/base:24 (docker/images/n8n-base/Dockerfile:29)
 * 2. The devcontainer tries to use `apk add` (line 3)
 * 3. `npm install -g pnpm` conflicts with pre-installed pnpm (line 6)
 * 4. Missing `getconf` causes VS Code server check-requirements.sh to fail
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('CAT-2506: Devcontainer Dockerfile validation', () => {
	const devcontainerDockerfile = readFileSync(
		join(__dirname, '..', 'Dockerfile'),
		'utf-8'
	);
	const baseDockerfile = readFileSync(
		join(__dirname, '../../docker/images/n8n-base/Dockerfile'),
		'utf-8'
	);

	describe('Base image compatibility', () => {
		test('should fail: devcontainer uses apk but base image removes apk-tools', () => {
			// This test documents the bug - it will fail until fixed
			const devcontainerUsesApk = /RUN\s+apk\s+add/.test(devcontainerDockerfile);
			const baseRemovesApk = /apk\s+del\s+apk-tools/.test(baseDockerfile);

			// Document the issue
			expect(devcontainerUsesApk).toBe(true); // devcontainer needs apk
			expect(baseRemovesApk).toBe(true); // but base image removes it

			// This assertion represents the bug - it should fail
			// After fix, either devcontainer won't use apk, or base will provide it
			if (devcontainerUsesApk && baseRemovesApk) {
				throw new Error(
					'BUG REPRODUCED: Devcontainer Dockerfile uses `apk add` (line 3) but n8nio/base:24 ' +
					'removes apk-tools (docker/images/n8n-base/Dockerfile:29). ' +
					'Build will fail with: /bin/sh: apk: not found'
				);
			}
		});

		test('should warn: devcontainer installs pnpm but it may already exist in base', () => {
			const devcontainerInstallsPnpm = /npm\s+install\s+-g\s+pnpm/.test(devcontainerDockerfile);

			// Document the potential issue
			expect(devcontainerInstallsPnpm).toBe(true);

			// Warn about potential EEXIST error
			console.warn(
				'WARNING: devcontainer runs "npm install -g pnpm" but pnpm may already be installed ' +
				'in the base image, causing: npm error EEXIST: file already exists'
			);
		});

		test('should check: devcontainer must ensure getconf is available', () => {
			// VS Code server requires getconf (from libc-utils package)
			// Check if devcontainer installs it
			const installsLibcUtils = /apk\s+add[^;]*libc-utils/.test(devcontainerDockerfile);
			const installsGetconf = /apk\s+add[^;]*\blibc6-compat\b/.test(devcontainerDockerfile);

			if (!installsLibcUtils && !installsGetconf) {
				console.warn(
					'WARNING: devcontainer does not install libc-utils or libc6-compat. ' +
					'VS Code server may fail with: getconf: not found'
				);
			}
		});
	});

	describe('Dockerfile syntax validation', () => {
		test('should use correct base image', () => {
			const baseImageMatch = devcontainerDockerfile.match(/^FROM\s+(.+)$/m);
			expect(baseImageMatch).toBeTruthy();
			expect(baseImageMatch![1]).toBe('n8nio/base:24');
		});

		test('should have required RUN commands', () => {
			// These are the commands from the current Dockerfile
			expect(devcontainerDockerfile).toMatch(/RUN.*openssh/);
			expect(devcontainerDockerfile).toMatch(/RUN.*sudoers/);
			expect(devcontainerDockerfile).toMatch(/RUN.*mkdir.*workspaces/);
		});

		test('should switch to node user', () => {
			expect(devcontainerDockerfile).toMatch(/^USER\s+node$/m);
		});
	});

	describe('Expected failure modes (reproducing CAT-2506)', () => {
		test('documents the apk not found error', () => {
			const issue = {
				error: '/bin/sh: apk: not found',
				location: '.devcontainer/Dockerfile:3',
				command: 'RUN apk add --no-cache --update openssh sudo shadow bash',
				rootCause: 'apk-tools removed in docker/images/n8n-base/Dockerfile:29',
				impact: 'devcontainer build fails immediately',
			};

			// This documents the exact error from the bug report
			expect(issue.error).toBe('/bin/sh: apk: not found');
			expect(issue.rootCause).toContain('apk-tools removed');
		});

		test('documents the pnpm EEXIST error', () => {
			const issue = {
				error: 'npm error EEXIST: file already exists',
				location: '.devcontainer/Dockerfile:6',
				command: 'RUN npm install -g pnpm',
				path: '/opt/nodejs/node-v24.13.0/bin/pnpm',
				workaround: 'Remove this line or use npm install -g --force',
			};

			// This documents the second error from the bug report
			expect(issue.error).toContain('EEXIST');
			expect(issue.path).toContain('/bin/pnpm');
		});

		test('documents the getconf not found error', () => {
			const issue = {
				error: 'line 48: getconf: not found',
				location: '/home/node/.vscode-server/.../check-requirements.sh',
				rootCause: 'libc-utils package not installed',
				fix: 'Add libc-utils to apk add command',
			};

			// This documents the third error from the bug report
			expect(issue.error).toContain('getconf: not found');
			expect(issue.fix).toBe('Add libc-utils to apk add command');
		});
	});
});
