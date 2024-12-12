import { mock } from 'jest-mock-extended';
import type { DirectoryLoader } from 'n8n-core';

import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';

describe('LoadNodesAndCredentials', () => {
	describe('resolveIcon', () => {
		let instance: LoadNodesAndCredentials;

		beforeEach(() => {
			instance = new LoadNodesAndCredentials(mock(), mock(), mock(), mock());
			instance.loaders.package1 = mock<DirectoryLoader>({
				directory: '/icons/package1',
			});
		});

		it('should return undefined if the loader for the package is not found', () => {
			const result = instance.resolveIcon('unknownPackage', '/icons/unknownPackage/icon.png');
			expect(result).toBeUndefined();
		});

		it('should return undefined if the resolved file path is outside the loader directory', () => {
			const result = instance.resolveIcon('package1', '/some/other/path/icon.png');
			expect(result).toBeUndefined();
		});

		it('should return the file path if the file is within the loader directory', () => {
			const result = instance.resolveIcon('package1', '/icons/package1/icon.png');
			expect(result).toBe('/icons/package1/icon.png');
		});

		it('should return undefined if the URL is outside the package directory', () => {
			const result = instance.resolveIcon('package1', '/icons/package1/../../../etc/passwd');
			expect(result).toBeUndefined();
		});
	});
});
