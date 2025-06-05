import { PackageDirectoryLoader } from '../package-directory-loader';

describe('clearNodesAndCredentialsFromRequireCache', () => {
	it('clears nodes and credentials from require.cache', () => {
		const fakeDir = '/mock/dir';
		const nodeFile = 'nodes/MyNode.js';
		const credFile = 'credentials/MyCredentials.js';

		const nodePath = `${fakeDir}/${nodeFile}`;
		const credPath = `${fakeDir}/${credFile}`;

		require.cache[nodePath] = { id: nodePath } as NodeModule;
		require.cache[credPath] = { id: credPath } as NodeModule;

		const readJSONSyncMock = jest
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.spyOn(PackageDirectoryLoader.prototype as any, 'readJSONSync')
			.mockReturnValue({
				name: 'fake-package',
				version: '1.0.0',
				n8n: {
					nodes: [nodeFile],
					credentials: [credFile],
				},
			});

		const loader = new PackageDirectoryLoader(fakeDir);

		loader.clearNodesAndCredentialsFromRequireCache();

		expect(require.cache[nodePath]).toBeUndefined();
		expect(require.cache[credPath]).toBeUndefined();

		readJSONSyncMock.mockRestore();
	});
});
