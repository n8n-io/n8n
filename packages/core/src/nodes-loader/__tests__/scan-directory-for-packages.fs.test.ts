import { Logger } from '@n8n/backend-common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { mockInstance } from '@test/utils';

import { scanDirectoryForPackages } from '../scan-directory-for-packages';

// Real-filesystem coverage that complements the mock-based unit tests in
// `scan-directory-for-packages.test.ts`. By writing actual directories to a
// temp dir we exercise the real `PackageDirectoryLoader` constructor, which
// reads `package.json` synchronously — the exact code path that threw and
// crash-looped boot before the missing-metadata directory was skipped.
describe('scanDirectoryForPackages (real filesystem)', () => {
	let nodeModulesDir: string;
	const logger = mockInstance(Logger);

	beforeEach(() => {
		nodeModulesDir = mkdtempSync(path.join(tmpdir(), 'n8n-scan-'));
	});

	afterEach(() => {
		rmSync(nodeModulesDir, { recursive: true, force: true });
	});

	const writePackage = (name: string) => {
		const dir = path.join(nodeModulesDir, name);
		mkdirSync(dir);
		writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
		return dir;
	};

	it('returns a loader for every healthy package directory', async () => {
		writePackage('n8n-nodes-good');
		writePackage('n8n-nodes-better');

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders.map((loader) => loader.packageName).sort()).toEqual([
			'n8n-nodes-better',
			'n8n-nodes-good',
		]);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	// A directory matching `n8n-nodes-*` left behind by a partial/corrupt
	// community-package install has no readable `package.json`. The broken
	// package should be logged and skipped so the instance still boots.
	it('logs and skips a matched package directory that has no package.json', async () => {
		// Broken package: matches the glob but has no package.json.
		mkdirSync(path.join(nodeModulesDir, 'n8n-nodes-foo'));
		// Healthy package alongside it.
		writePackage('n8n-nodes-good');

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect(loaders[0].packageName).toBe('n8n-nodes-good');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('n8n-nodes-foo'),
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});
});
