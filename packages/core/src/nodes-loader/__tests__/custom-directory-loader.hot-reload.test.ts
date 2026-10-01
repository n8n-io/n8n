import type { INodeTypeDescription } from 'n8n-workflow';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { CustomDirectoryLoader } from '../custom-directory-loader';

/**
 * Reproduces NODE-5225: when a community node is developed with `n8n-node dev`,
 * the package is symlinked into `<customDir>/node_modules/<pkg>` and rebuilt on
 * change. Reloading the node (reset + loadAll) should serve the freshly compiled
 * code, but the loader kept serving the previously loaded version until restart.
 */
describe('CustomDirectoryLoader hot reload (NODE-5225)', () => {
	let tmpRoot: string;
	let customDir: string;

	const nodeSource = (version: number) => `
		class Reloadable {
			constructor() {
				this.description = {
					displayName: 'Reloadable',
					name: 'reloadable',
					group: ['transform'],
					version: ${version},
					description: 'v${version}',
					defaults: { name: 'Reloadable' },
					inputs: ['main'],
					outputs: ['main'],
					properties: [],
				};
			}
		}
		module.exports = { Reloadable };
	`;

	const writeNode = (dir: string, version: number) => {
		fs.mkdirSync(dir, { recursive: true });
		const file = path.join(dir, 'Reloadable.node.js');
		fs.writeFileSync(file, nodeSource(version));
		return file;
	};

	// The node description type is a union; the fixture is a non-versioned node.
	const loadedVersion = (loader: CustomDirectoryLoader) =>
		(loader.getNode('reloadable').type.description as INodeTypeDescription).version;

	beforeEach(() => {
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-hot-reload-'));
		customDir = path.join(tmpRoot, 'custom');
		fs.mkdirSync(customDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('serves the recompiled node after reset + loadAll (symlinked dev node)', async () => {
		// The developer's node project, compiled to `dist`.
		const projectDir = path.join(tmpRoot, 'my-node-project');
		const nodeFile = writeNode(path.join(projectDir, 'dist', 'nodes'), 1);

		// The project is symlinked into node_modules, exactly how `n8n-node dev`
		// installs the node for live preview.
		const customNodeModules = path.join(customDir, 'node_modules');
		fs.mkdirSync(customNodeModules, { recursive: true });
		fs.symlinkSync(projectDir, path.join(customNodeModules, 'n8n-nodes-reloadable'));

		const loader = new CustomDirectoryLoader(customDir);

		await loader.loadAll();
		expect(loadedVersion(loader)).toBe(1);

		// Simulate a rebuild by the watchdog (e.g. `tsc --watch`).
		fs.writeFileSync(nodeFile, nodeSource(2));

		// Reload the node the same way the hot-reload flow does.
		loader.reset();
		await loader.loadAll();

		expect(loadedVersion(loader)).toBe(2);
	});

	it('serves the recompiled node after reset + loadAll (symlinked scoped dev node)', async () => {
		// Scoped community node (`@scope/n8n-nodes-foo`): the package is symlinked
		// one level deeper, under `node_modules/@scope/<pkg>`.
		const projectDir = path.join(tmpRoot, 'my-scoped-node-project');
		const nodeFile = writeNode(path.join(projectDir, 'dist', 'nodes'), 1);

		const scopeDir = path.join(customDir, 'node_modules', '@scope');
		fs.mkdirSync(scopeDir, { recursive: true });
		fs.symlinkSync(projectDir, path.join(scopeDir, 'n8n-nodes-reloadable'));

		const loader = new CustomDirectoryLoader(customDir);

		await loader.loadAll();
		expect(loadedVersion(loader)).toBe(1);

		fs.writeFileSync(nodeFile, nodeSource(2));

		loader.reset();
		await loader.loadAll();

		expect(loadedVersion(loader)).toBe(2);
	});

	it('serves the recompiled node after reset + loadAll (node placed directly in custom dir)', async () => {
		// Classic `~/.n8n/custom` layout: no `node_modules`, no symlink.
		const nodeFile = writeNode(path.join(customDir, 'Reloadable'), 1);

		const loader = new CustomDirectoryLoader(customDir);

		await loader.loadAll();
		expect(loadedVersion(loader)).toBe(1);

		fs.writeFileSync(nodeFile, nodeSource(2));

		loader.reset();
		await loader.loadAll();

		expect(loadedVersion(loader)).toBe(2);
	});
});
