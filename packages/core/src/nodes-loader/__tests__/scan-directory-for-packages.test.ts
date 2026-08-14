// eslint-disable-next-line import-x/order
import { mock } from 'vitest-mock-extended';
import { Logger } from '@n8n/backend-common';
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

	const enoent = (file: string): NodeJS.ErrnoException => {
		const error: NodeJS.ErrnoException = new Error(
			`ENOENT: no such file or directory, open '${file}'`,
		);
		error.code = 'ENOENT';
		return error;
	};

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
});
