import fsPromises from 'fs/promises';
import path from 'path';

import { resolveCustomNodePackagePaths } from '../utils';

jest.mock('fs/promises');

const mockReaddir = jest.mocked(fsPromises.readdir);
const mockRealpath = jest.mocked(fsPromises.realpath);

describe('resolveCustomNodePackagePaths', () => {
	const nodeModulesDir = '/home/user/.n8n/custom/node_modules';

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should resolve unscoped package paths', async () => {
		mockReaddir.mockResolvedValueOnce([
			{ name: 'n8n-nodes-example', isDirectory: () => true, isSymbolicLink: () => false },
		] as never);

		mockRealpath.mockResolvedValueOnce('/real/path/n8n-nodes-example');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(mockReaddir).toHaveBeenCalledWith(nodeModulesDir, { withFileTypes: true });
		expect(mockRealpath).toHaveBeenCalledWith(
			path.join(nodeModulesDir, 'n8n-nodes-example'),
		);
		expect(result).toEqual(['/real/path/n8n-nodes-example']);
	});

	it('should resolve scoped package paths', async () => {
		mockReaddir
			// First call: read node_modules root
			.mockResolvedValueOnce([
				{ name: '@example-scope', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			// Second call: read @example-scope/ directory
			.mockResolvedValueOnce([
				{
					name: 'n8n-nodes-example',
					isDirectory: () => true,
					isSymbolicLink: () => false,
				},
			] as never);

		mockRealpath.mockResolvedValueOnce('/real/path/scoped-example');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(mockReaddir).toHaveBeenCalledTimes(2);
		expect(mockReaddir).toHaveBeenCalledWith(nodeModulesDir, { withFileTypes: true });
		expect(mockReaddir).toHaveBeenCalledWith(
			path.join(nodeModulesDir, '@example-scope'),
			{ withFileTypes: true },
		);
		expect(mockRealpath).toHaveBeenCalledWith(
			path.join(nodeModulesDir, '@example-scope', 'n8n-nodes-example'),
		);
		expect(result).toEqual(['/real/path/scoped-example']);
	});

	it('should resolve both scoped and unscoped packages together', async () => {
		mockReaddir
			.mockResolvedValueOnce([
				{ name: 'n8n-nodes-unscoped', isDirectory: () => true, isSymbolicLink: () => false },
				{ name: '@my-scope', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			.mockResolvedValueOnce([
				{ name: 'n8n-nodes-scoped', isDirectory: () => true, isSymbolicLink: () => false },
			] as never);

		mockRealpath
			.mockResolvedValueOnce('/real/unscoped')
			.mockResolvedValueOnce('/real/scoped');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/real/unscoped', '/real/scoped']);
	});

	it('should resolve symlinked packages', async () => {
		mockReaddir.mockResolvedValueOnce([
			{ name: 'n8n-nodes-linked', isDirectory: () => false, isSymbolicLink: () => true },
		] as never);

		mockRealpath.mockResolvedValueOnce('/original/source/n8n-nodes-linked');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/original/source/n8n-nodes-linked']);
	});

	it('should resolve symlinked scoped packages', async () => {
		mockReaddir
			.mockResolvedValueOnce([
				{ name: '@my-scope', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			.mockResolvedValueOnce([
				{ name: 'n8n-nodes-linked', isDirectory: () => false, isSymbolicLink: () => true },
			] as never);

		mockRealpath.mockResolvedValueOnce('/original/source/n8n-nodes-linked');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/original/source/n8n-nodes-linked']);
	});

	it('should skip hidden entries', async () => {
		mockReaddir.mockResolvedValueOnce([
			{ name: '.hidden', isDirectory: () => true, isSymbolicLink: () => false },
			{ name: 'n8n-nodes-visible', isDirectory: () => true, isSymbolicLink: () => false },
		] as never);

		mockRealpath.mockResolvedValueOnce('/real/visible');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(mockRealpath).toHaveBeenCalledTimes(1);
		expect(result).toEqual(['/real/visible']);
	});

	it('should skip hidden entries inside scope directories', async () => {
		mockReaddir
			.mockResolvedValueOnce([
				{ name: '@scope', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			.mockResolvedValueOnce([
				{ name: '.hidden-pkg', isDirectory: () => true, isSymbolicLink: () => false },
				{ name: 'n8n-nodes-visible', isDirectory: () => true, isSymbolicLink: () => false },
			] as never);

		mockRealpath.mockResolvedValueOnce('/real/visible');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(mockRealpath).toHaveBeenCalledTimes(1);
		expect(result).toEqual(['/real/visible']);
	});

	it('should handle realpath failures gracefully', async () => {
		mockReaddir.mockResolvedValueOnce([
			{ name: 'broken-link', isDirectory: () => false, isSymbolicLink: () => true },
			{ name: 'working-pkg', isDirectory: () => true, isSymbolicLink: () => false },
		] as never);

		mockRealpath
			.mockRejectedValueOnce(new Error('ENOENT'))
			.mockResolvedValueOnce('/real/working');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/real/working']);
	});

	it('should return empty array when node_modules directory does not exist', async () => {
		mockReaddir.mockRejectedValueOnce(new Error('ENOENT'));

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual([]);
	});

	it('should handle scope directory read failures gracefully', async () => {
		mockReaddir
			.mockResolvedValueOnce([
				{ name: '@broken-scope', isDirectory: () => true, isSymbolicLink: () => false },
				{ name: 'n8n-nodes-ok', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			.mockRejectedValueOnce(new Error('EACCES'));

		mockRealpath.mockResolvedValueOnce('/real/ok');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/real/ok']);
	});

	it('should handle multiple packages in a single scope', async () => {
		mockReaddir
			.mockResolvedValueOnce([
				{ name: '@my-org', isDirectory: () => true, isSymbolicLink: () => false },
			] as never)
			.mockResolvedValueOnce([
				{ name: 'n8n-nodes-first', isDirectory: () => true, isSymbolicLink: () => false },
				{ name: 'n8n-nodes-second', isDirectory: () => true, isSymbolicLink: () => false },
			] as never);

		mockRealpath
			.mockResolvedValueOnce('/real/first')
			.mockResolvedValueOnce('/real/second');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(result).toEqual(['/real/first', '/real/second']);
	});

	it('should skip files (non-directory, non-symlink) at root level', async () => {
		mockReaddir.mockResolvedValueOnce([
			{ name: 'package-lock.json', isDirectory: () => false, isSymbolicLink: () => false },
			{ name: 'n8n-nodes-real', isDirectory: () => true, isSymbolicLink: () => false },
		] as never);

		mockRealpath.mockResolvedValueOnce('/real/path');

		const result = await resolveCustomNodePackagePaths(nodeModulesDir);

		expect(mockRealpath).toHaveBeenCalledTimes(1);
		expect(result).toEqual(['/real/path']);
	});
});
