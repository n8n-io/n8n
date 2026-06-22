import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { CustomDirectoryLoader } from '../custom-directory-loader';

/**
 * Reproduces NODE-5225: when a community node is developed with `n8n-node dev`,
 * the package is symlinked into `<customDir>/node_modules/<pkg>` and rebuilt on
 * change. Reloading the node (reset + loadAll) should serve the freshly compiled
 * code, but the loader keeps serving the previously loaded version until restart.
 */
describe('CustomDirectoryLoader hot reload through symlink (NODE-5225)', () => {
	let tmpRoot: string;
	let customDir: string;
	let projectDir: string;
	let nodeFile: string;

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

	beforeEach(() => {
		tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-hot-reload-'));

		// The developer's node project, compiled to `dist`.
		projectDir = path.join(tmpRoot, 'my-node-project');
		const distNodesDir = path.join(projectDir, 'dist', 'nodes');
		fs.mkdirSync(distNodesDir, { recursive: true });
		nodeFile = path.join(distNodesDir, 'Reloadable.node.js');
		fs.writeFileSync(nodeFile, nodeSource(1));

		// The n8n custom extension dir with the project symlinked into node_modules,
		// exactly how `n8n-node dev` installs the node for live preview.
		customDir = path.join(tmpRoot, 'custom');
		const customNodeModules = path.join(customDir, 'node_modules');
		fs.mkdirSync(customNodeModules, { recursive: true });
		fs.symlinkSync(projectDir, path.join(customNodeModules, 'n8n-nodes-reloadable'));
	});

	afterEach(() => {
		fs.rmSync(tmpRoot, { recursive: true, force: true });
	});

	it('serves the recompiled node after reset + loadAll', async () => {
		const loader = new CustomDirectoryLoader(customDir);

		await loader.loadAll();
		expect(loader.getNode('reloadable').type.description.version).toBe(1);

		// Simulate a rebuild by the watchdog (e.g. `tsc --watch`).
		fs.writeFileSync(nodeFile, nodeSource(2));

		// Reload the node the same way the hot-reload flow does.
		loader.reset();
		await loader.loadAll();

		expect(loader.getNode('reloadable').type.description.version).toBe(2);
	});
});
