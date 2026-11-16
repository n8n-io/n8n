import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { Logger } from '../../logger';
import {
	findLinkedWorkspacePackages,
	packWorkspacePackageList,
	SANDBOX_LINK_ROOT_PACKAGE,
} from '../pack-workspace-sdk';

const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};

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

	it('finds the complete runtime workspace dependency closure for snapshots', async () => {
		const sdkPath = path.dirname(require.resolve(`${SANDBOX_LINK_ROOT_PACKAGE}/package.json`));

		const found = await findLinkedWorkspacePackages(SANDBOX_LINK_ROOT_PACKAGE, sdkPath, null);

		expect(found.map((pkg) => pkg.name).sort()).toEqual([
			'@n8n/constants',
			'@n8n/errors',
			'@n8n/expression-runtime',
			'@n8n/tournament',
			'@n8n/utils',
			'@n8n/workflow-sdk',
			'n8n-workflow',
		]);
		const names = found.map((pkg) => pkg.name);
		expect(names.indexOf('@n8n/constants')).toBeLessThan(names.indexOf('@n8n/utils'));
		expect(names.indexOf('@n8n/expression-runtime')).toBeLessThan(names.indexOf('n8n-workflow'));
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

describe('packWorkspacePackageList', () => {
	it('packs every discovered package in order', async () => {
		const packPackage = vi.fn(
			async (_logger: Logger, packageName: string, packagePath: string) => ({
				filename: `${packageName}.tgz`,
				packageName,
				packagePath,
				tarball: Buffer.from(packageName),
				version: '1.0.0',
			}),
		);

		const result = await packWorkspacePackageList(
			NOOP_LOGGER,
			[
				{ name: 'dependency', path: '/repo/dependency' },
				{ name: 'root', path: '/repo/root' },
			],
			packPackage,
		);

		expect(result.map(({ packageName }) => packageName)).toEqual(['dependency', 'root']);
		expect(packPackage).toHaveBeenCalledTimes(2);
	});

	it('fails when a discovered package cannot be packed', async () => {
		const packPackage = vi.fn(async () => await Promise.resolve(null));

		await expect(
			packWorkspacePackageList(
				NOOP_LOGGER,
				[{ name: 'missing', path: '/repo/missing' }],
				packPackage,
			),
		).rejects.toThrow('missing could not be packed');
	});
});
