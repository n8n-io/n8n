// eslint-disable-next-line import-x/order
import { mock } from 'vitest-mock-extended';
import { Logger } from '@n8n/backend-common';
import { N8N_NODES_API_VERSION } from 'n8n-workflow';
import * as fs from 'node:fs';
import type * as fsPromises from 'node:fs/promises';

vi.mock('node:fs', () => mock<typeof fs>());
vi.mock('node:fs/promises', () => mock<typeof fsPromises>());

const mockFs = mock(fs);

vi.mock('fast-glob', () => ({
	default: async (pattern: string) => {
		if (pattern === '@*/n8n-nodes-*') {
			return ['@mendable/n8n-nodes-firecrawl', '@elevenlabs/n8n-nodes-elevenlabs'];
		}
		return [];
	},
}));

import { mockInstance } from '@test/utils';

import { LazyPackageDirectoryLoader } from '../lazy-package-directory-loader';
import { scanDirectoryForPackages } from '../scan-directory-for-packages';

describe('scanDirectoryForPackages', () => {
	const nodeModulesDir = '/data/nodes/node_modules';
	let logger: ReturnType<typeof mock<Logger>>;

	const packageJsonFor = (filePath: string) =>
		filePath.includes('elevenlabs')
			? JSON.stringify({ name: '@elevenlabs/n8n-nodes-elevenlabs', version: '1.0.0' })
			: JSON.stringify({ name: '@mendable/n8n-nodes-firecrawl', version: '2.1.2' });

	const firecrawlPackageJson = (n8n?: object) =>
		JSON.stringify({ name: '@mendable/n8n-nodes-firecrawl', version: '2.1.2', ...{ n8n } });

	const enoent = (file: string): NodeJS.ErrnoException => {
		const error: NodeJS.ErrnoException = new Error(
			`ENOENT: no such file or directory, open '${file}'`,
		);
		error.code = 'ENOENT';
		return error;
	};

	const mockPackageJsonOnDisk = (firecrawlJson: string) =>
		mockFs.readFileSync.mockImplementation((filePath) => {
			const file = String(filePath);
			if (file.includes('firecrawl')) return firecrawlJson;
			return packageJsonFor(file);
		});

	beforeEach(() => {
		vi.clearAllMocks();
		logger = mockInstance(Logger);
		// Symlink resolution at construction time resolves to the same path.
		mockFs.realpathSync.mockImplementation((p) => p as string);
	});

	it('skips a directory whose package.json is missing and returns the valid loaders', async () => {
		mockFs.readFileSync.mockImplementation((filePath) => {
			const file = String(filePath);
			if (file.includes('firecrawl')) throw enoent(file);
			return packageJsonFor(file);
		});

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect(loaders[0]).toBeInstanceOf(LazyPackageDirectoryLoader);
		expect((loaders[0] as LazyPackageDirectoryLoader).packageName).toBe(
			'@elevenlabs/n8n-nodes-elevenlabs',
		);
	});

	it('skips a directory whose package.json is malformed and returns the valid loaders', async () => {
		mockFs.readFileSync.mockImplementation((filePath) => {
			const file = String(filePath);
			if (file.includes('firecrawl')) return '{ not valid json';
			return packageJsonFor(file);
		});

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect((loaders[0] as LazyPackageDirectoryLoader).packageName).toBe(
			'@elevenlabs/n8n-nodes-elevenlabs',
		);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	it('logs a warning for each skipped directory', async () => {
		mockFs.readFileSync.mockImplementation((filePath) => {
			const file = String(filePath);
			if (file.includes('firecrawl')) throw enoent(file);
			return packageJsonFor(file);
		});

		await scanDirectoryForPackages(nodeModulesDir);

		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('@mendable/n8n-nodes-firecrawl'),
			expect.objectContaining({ error: expect.any(Error) }),
		);
	});

	it('returns a loader for every directory when all are well-formed', async () => {
		mockFs.readFileSync.mockImplementation((filePath) => packageJsonFor(String(filePath)));

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(2);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('skips a package requiring an unsupported node API version and keeps compatible ones', async () => {
		mockPackageJsonOnDisk(firecrawlPackageJson({ n8nNodesApiVersion: N8N_NODES_API_VERSION + 1 }));

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect((loaders[0] as LazyPackageDirectoryLoader).packageName).toBe(
			'@elevenlabs/n8n-nodes-elevenlabs',
		);
	});

	it('returns a loader for a package declaring a supported node API version', async () => {
		mockPackageJsonOnDisk(firecrawlPackageJson({ n8nNodesApiVersion: 1 }));

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(2);
	});

	it('returns a loader for a package without node API version metadata (legacy v1)', async () => {
		mockPackageJsonOnDisk(firecrawlPackageJson());

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(2);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('logs name, declared version, supported version, and remediation for an unsupported package', async () => {
		mockPackageJsonOnDisk(firecrawlPackageJson({ n8nNodesApiVersion: N8N_NODES_API_VERSION + 1 }));

		await scanDirectoryForPackages(nodeModulesDir);

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('@mendable/n8n-nodes-firecrawl'),
		);
		const [message] = vi.mocked(logger.warn).mock.calls[0];
		expect(message).toContain(`node API version ${N8N_NODES_API_VERSION + 1}`);
		expect(message).toContain(`supports up to ${N8N_NODES_API_VERSION}`);
		expect(message).toContain('Upgrade n8n');
	});

	it('skips a package with a malformed node API version', async () => {
		mockPackageJsonOnDisk(firecrawlPackageJson({ n8nNodesApiVersion: '3' }));

		const loaders = await scanDirectoryForPackages(nodeModulesDir);

		expect(loaders).toHaveLength(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid n8nNodesApiVersion'));
	});
});
