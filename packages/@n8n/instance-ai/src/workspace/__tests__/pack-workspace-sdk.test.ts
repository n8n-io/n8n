import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { findLinkedWorkspacePackages, SANDBOX_LINK_ROOT_PACKAGE } from '../pack-workspace-sdk';

async function writePackage(dir: string, name: string, dependencies: Record<string, string> = {}) {
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, dependencies }));
}

describe('findLinkedWorkspacePackages', () => {
	let root: string;

	beforeEach(async () => {
		// The real path, because module resolution returns real paths (/var is a link on macOS).
		root = await realpath(await mkdtemp(path.join(tmpdir(), 'linked-packages-')));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it('finds the linked packages of the monorepo, also those the host package does not depend on', async () => {
		const sdkPath = path.dirname(require.resolve(`${SANDBOX_LINK_ROOT_PACKAGE}/package.json`));

		const found = await findLinkedWorkspacePackages(SANDBOX_LINK_ROOT_PACKAGE, sdkPath);

		expect(found.map((pkg) => pkg.name).sort()).toEqual([
			'@n8n/errors',
			'@n8n/utils',
			'@n8n/workflow-sdk',
			'n8n-workflow',
		]);
		const names = found.map((pkg) => pkg.name);
		expect(names.indexOf('@n8n/errors')).toBeLessThan(names.indexOf('n8n-workflow'));
		expect(names.at(-1)).toBe('@n8n/workflow-sdk');
	});

	it('resolves a dependency from the package that depends on it, and skips packages that are not linked', async () => {
		const rootPath = path.join(root, 'sdk');
		const workflowPath = path.join(rootPath, 'node_modules', 'workflow');
		await writePackage(rootPath, 'sdk', {
			workflow: 'workspace:*',
			constants: 'workspace:*',
			lodash: '^4.0.0',
		});
		await writePackage(workflowPath, 'workflow', { errors: 'workspace:*' });
		await writePackage(path.join(workflowPath, 'node_modules', 'errors'), 'errors');

		const found = await findLinkedWorkspacePackages(
			'sdk',
			rootPath,
			new Set(['sdk', 'workflow', 'errors']),
		);

		expect(found).toEqual([
			{ name: 'errors', path: path.join(workflowPath, 'node_modules', 'errors') },
			{ name: 'workflow', path: workflowPath },
			{ name: 'sdk', path: rootPath },
		]);
	});

	it('throws when a linked dependency cannot be resolved', async () => {
		const rootPath = path.join(root, 'sdk');
		await writePackage(rootPath, 'sdk', { errors: 'workspace:*' });

		await expect(
			findLinkedWorkspacePackages('sdk', rootPath, new Set(['sdk', 'errors'])),
		).rejects.toThrow('errors (a dependency of sdk) could not be resolved');
	});
});
