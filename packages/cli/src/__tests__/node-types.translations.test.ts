import type { Logger } from '@n8n/backend-common';
import { PackageDirectoryLoader } from 'n8n-core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

/**
 * Regression test for https://github.com/n8n-io/n8n/issues/38263
 *
 * `PackageDirectoryLoader` stores a package-relative `sourcePath` for every node
 * it loads (`dist/nodes/Fixture/Fixture.node.js`). When the locale is not `en`,
 * `getDescriptionWithTranslation` reads the node directory to find the highest
 * version folder, so the relative path must first be resolved against the
 * package directory, and a directory that cannot be read must degrade to "no
 * translation" instead of failing the request.
 */
describe('NodeTypes translations', () => {
	const PACKAGE_NAME = 'n8n-nodes-fixture';
	const NODE_TYPE = `${PACKAGE_NAME}.fixture`;

	const nodeSource = `
		class Fixture {
			constructor() {
				this.description = {
					displayName: 'Fixture',
					name: 'fixture',
					group: ['transform'],
					version: 1,
					description: 'Fixture node',
					defaults: { name: 'Fixture' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				};
			}
		}
		module.exports = { Fixture };
	`;

	const translation = {
		header: { displayName: 'Fixture (de)', description: 'Fixture-Knoten' },
	};

	let tmpRoot: string;
	let packageDir: string;
	let nodeTypes: NodeTypes;

	beforeEach(async () => {
		tmpRoot = mkdtempSync(join(tmpdir(), 'n8n-node-translations-'));
		packageDir = join(tmpRoot, 'nodes-fixture');

		const nodeDir = join(packageDir, 'dist', 'nodes', 'Fixture');
		const localeDir = join(nodeDir, 'translations', 'de');
		mkdirSync(localeDir, { recursive: true });

		writeFileSync(
			join(packageDir, 'package.json'),
			JSON.stringify({
				name: PACKAGE_NAME,
				version: '1.0.0',
				n8n: { nodes: ['dist/nodes/Fixture/Fixture.node.js'] },
			}),
		);
		writeFileSync(join(nodeDir, 'Fixture.node.js'), nodeSource);
		writeFileSync(join(localeDir, 'fixture.json'), JSON.stringify(translation));

		const loader = new PackageDirectoryLoader(packageDir);
		await loader.loadAll();

		const loadNodesAndCredentials = new LoadNodesAndCredentials(
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);
		loadNodesAndCredentials.loaders[PACKAGE_NAME] = loader;

		nodeTypes = new NodeTypes(mock<Logger>(), loadNodesAndCredentials);
	});

	afterEach(() => {
		rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('should load the translation of a node loaded from a package directory', async () => {
		const description = await nodeTypes.getDescriptionWithTranslation(NODE_TYPE, 1, 'de');

		expect(description.translation).toEqual(translation);
	});

	it('should return the untranslated description when the node directory cannot be read', async () => {
		// The node type is already in memory, so removing the package from disk
		// only makes the lookup of the translation fail.
		rmSync(packageDir, { recursive: true, force: true });

		const description = await nodeTypes.getDescriptionWithTranslation(NODE_TYPE, 1, 'de');

		expect(description.name).toBe('fixture');
		expect(description.translation).toBeUndefined();
	});
});
