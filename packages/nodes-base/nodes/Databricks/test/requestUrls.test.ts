import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { execute as createDirectory } from '../actions/files/createDirectory.operation';
import { execute as deleteFile } from '../actions/files/deleteFile.operation';
import { execute as getSpace } from '../actions/genie/getSpace.operation';
import { toRequestPath } from '../actions/helpers';
import { execute as getCatalog } from '../actions/unityCatalog/getCatalog.operation';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';

const createContext = (parameters: Record<string, string>, typeVersion = 1.1) => {
	const context = mockDeep<IExecuteFunctions>();
	context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getCredentials.mockResolvedValue({ host: HOST });
	context.getNodeParameter.mockImplementation(
		(name: string, _itemIndex: number, fallback?: unknown) => parameters[name] ?? fallback,
	);
	context.helpers.httpRequestWithAuthentication.mockResolvedValue({});
	return context;
};

const requestedUrl = (context: ReturnType<typeof createContext>) =>
	String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url);

describe('Databricks request URLs', () => {
	it('should encode "/" in a Genie space ID', async () => {
		const context = createContext({ spaceId: 'space/unity-catalog/catalogs' });
		// Genie operations read the full response
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({ body: {}, headers: {} });

		await getSpace.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/genie/spaces/space%2Funity-catalog%2Fcatalogs`,
		);
	});

	it('should reject a Genie space ID with a dot segment', async () => {
		const context = createContext({ spaceId: '../../2.1/unity-catalog/catalogs' });

		await expect(getSpace.call(context, 0)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should reject ".." as a catalog name', async () => {
		const context = createContext({ catalogName: '..' });

		await expect(getCatalog.call(context, 0)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('should keep "/" between the folders of a file path and encode each folder', async () => {
		const context = createContext({
			volumePath: 'main.default.my_volume',
			filePath: 'reports/2024/q1 #draft?.csv',
		});

		await deleteFile.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/fs/files/Volumes/main/default/my_volume/reports/2024/q1%20%23draft%3F.csv`,
		);
	});

	it.each([
		['reports/my%20file.csv', 'reports/my%2520file.csv'],
		['reports/my%2520file.csv', 'reports/my%252520file.csv'],
		['reports/q1+q2.csv', 'reports/q1%2Bq2.csv'],
	])('should send the file path %s as %s in node version 1.1', async (filePath, expected) => {
		const context = createContext({ volumePath: 'main.default.my_volume', filePath });

		await deleteFile.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/fs/files/Volumes/main/default/my_volume/${expected}`,
		);
	});

	it.each([
		['reports/my%20file.csv', 'reports/my%20file.csv'],
		['reports/my%2520file.csv', 'reports/my%2520file.csv'],
		['reports/q1+q2.csv', 'reports/q1%2Bq2.csv'],
	])('should send the file path %s as %s in node version 1', async (filePath, expected) => {
		const context = createContext({ volumePath: 'main.default.my_volume', filePath }, 1);

		await deleteFile.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/fs/files/Volumes/main/default/my_volume/${expected}`,
		);
	});

	it.each([
		[1, 'my%20reports/2024'],
		[1.1, 'my%2520reports/2024'],
	])('should send the directory path of node version %s as %s', async (version, expected) => {
		const context = createContext(
			{ volumePath: 'main.default.my_volume', directoryPath: 'my%20reports/2024' },
			version,
		);

		await createDirectory.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/fs/directories/Volumes/main/default/my_volume/${expected}`,
		);
	});

	it('should keep a trailing "/" in a directory path', async () => {
		const context = createContext({
			volumePath: 'main.default.my_volume',
			directoryPath: 'reports/2024/',
		});

		await createDirectory.call(context, 0);

		expect(requestedUrl(context)).toBe(
			`${HOST}/api/2.0/fs/directories/Volumes/main/default/my_volume/reports/2024/`,
		);
	});

	it('should reject a file path that leaves the volume', async () => {
		const context = createContext({
			volumePath: 'main.default.my_volume',
			filePath: '../../other_catalog/default/other_volume/data.csv',
		});

		await expect(deleteFile.call(context, 0)).rejects.toThrow('Invalid identifier');
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});

describe('toRequestPath', () => {
	it('should build a rooted path from the folders of a path', () => {
		expect(String(toRequestPath('folder1/sub folder/file.txt', 1.1))).toBe(
			'/folder1/sub%20folder/file.txt',
		);
	});

	it.each([
		['reports/2024/', '/reports/2024/'],
		['/Volumes/main/default/file.txt', '//Volumes/main/default/file.txt'],
		['folder//file.txt', '/folder//file.txt'],
	])('should keep the empty parts of %j', (path, expected) => {
		expect(String(toRequestPath(path, 1.1))).toBe(expected);
	});

	it('should decode the path in node version 1 only', () => {
		expect(String(toRequestPath('a%2Fb', 1))).toBe('/a%2Fb');
		expect(String(toRequestPath('a/b%20c', 1))).toBe('/a/b%20c');
		expect(String(toRequestPath('a%2Fb', 1.1))).toBe('/a%252Fb');
	});

	it.each(['folder/./file.txt', '../other_catalog/file.txt', 'folder/..'])(
		'should reject %j',
		(path) => {
			expect(() => toRequestPath(path, 1.1)).toThrow('Invalid identifier');
		},
	);
});
