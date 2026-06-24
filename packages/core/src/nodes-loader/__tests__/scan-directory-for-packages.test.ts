import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { scanDirectoryForPackages } from '../scan-directory-for-packages';

describe('scanDirectoryForPackages', () => {
	let nodeModulesDir: string;

	beforeEach(() => {
		nodeModulesDir = mkdtempSync(path.join(tmpdir(), 'n8n-scan-'));
	});

	afterEach(() => {
		rmSync(nodeModulesDir, { recursive: true, force: true });
	});

	// Reproduces NODE-5161: a directory matching `n8n-nodes-*` left behind by a
	// partial/corrupt community-package install has no readable `package.json`.
	// The broken package should be skipped so the instance still boots.
	it('skips a matched package directory that has no package.json', async () => {
		// Broken package: matches the glob but has no package.json
		mkdirSync(path.join(nodeModulesDir, 'n8n-nodes-foo'));

		// Healthy package alongside it
		const goodDir = path.join(nodeModulesDir, 'n8n-nodes-good');
		mkdirSync(goodDir);
		writeFileSync(
			path.join(goodDir, 'package.json'),
			JSON.stringify({ name: 'n8n-nodes-good', version: '1.0.0' }),
		);

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect(loaders[0].packageName).toBe('n8n-nodes-good');
	});
});
