import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { Dropbox } from '../Dropbox.node';
import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	dropboxApiRequest: vi.fn(),
	dropboxpiRequestAllItems: vi.fn(),
	getRootDirectory: vi.fn(),
}));

/**
 * Build a mock IExecuteFunctions whose getNodeParameter returns the supplied
 * values. Parameters that are not supplied fall back to the default value.
 * Mirrors the helper used by the Gitlab test suite.
 */
function createMockExecuteFunction(
	params: Record<string, any>,
	options: { items?: Array<{ json: Record<string, any> }> } = {},
) {
	const merged: Record<string, any> = {
		authentication: 'accessToken',
		...params,
	};

	return {
		getNodeParameter: vi.fn((paramName: string, _itemIndex?: number, fallback?: any) =>
			paramName in merged ? merged[paramName] : fallback,
		),
		getInputData: vi.fn().mockReturnValue(options.items ?? [{ json: {} }]),
		getNode: vi.fn().mockReturnValue({
			id: 'test-node-id',
			name: 'Dropbox',
			type: 'n8n-nodes-base.dropbox',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			requestWithAuthentication: vi.fn(),
			requestOAuth2: vi.fn(),
			returnJsonArray: vi.fn((data: any) => {
				if (Array.isArray(data)) {
					return data.map((item) => ({ json: item }));
				}
				return [{ json: data }];
			}),
			constructExecutionMetaData: vi.fn((data: any) => data),
			assertBinaryData: vi.fn(),
			getBinaryDataBuffer: vi.fn(),
			prepareBinaryData: vi.fn(),
		},
		getCredentials: vi.fn().mockResolvedValue({ accessType: 'private' }),
		continueOnFail: vi.fn().mockReturnValue(false),
	} as any;
}

describe('Dropbox Node', () => {
	let dropbox: Dropbox;

	beforeEach(() => {
		dropbox = new Dropbox();
		vi.clearAllMocks();
	});

	describe('File', () => {
		it('downloads a file and attaches the binary data', async () => {
			const mock = createMockExecuteFunction(
				{
					resource: 'file',
					operation: 'download',
					path: '/report.pdf',
					binaryPropertyName: 'data',
				},
				{ items: [{ json: { id: 1 } }] },
			);
			const preparedBinary = {
				data: 'file-content',
				mimeType: 'application/pdf',
				fileName: '/report.pdf',
			};
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue('file-content');
			mock.helpers.prepareBinaryData.mockResolvedValue(preparedBinary);

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://content.dropboxapi.com/2/files/download',
				{},
				{ arg: JSON.stringify({ path: '/report.pdf' }) },
				{},
				{ encoding: null },
			);
			expect(mock.helpers.prepareBinaryData).toHaveBeenCalledWith(
				Buffer.from('file-content'),
				'/report.pdf',
			);
			expect(result[0][0].binary!.data).toEqual(preparedBinary);
		});

		it('uploads text content', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'upload',
				path: '/note.txt',
				binaryData: false,
				fileContent: 'hello world',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue(
				JSON.stringify({ id: 'id-1', name: 'note.txt' }),
			);

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://content.dropboxapi.com/2/files/upload',
				Buffer.from('hello world', 'utf8'),
				{ arg: JSON.stringify({ mode: 'overwrite', path: '/note.txt' }) },
				{ 'Content-Type': 'application/octet-stream' },
				{ json: false },
			);
			expect(result[0]).toEqual([{ json: { id: 'id-1', name: 'note.txt' } }]);
		});

		it('uploads binary content from the input item', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'upload',
				path: '/image.png',
				binaryData: true,
				binaryPropertyName: 'data',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue(
				JSON.stringify({ id: 'id-2', name: 'image.png' }),
			);
			mock.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('binary'));

			await dropbox.execute.call(mock);

			expect(mock.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
			expect(mock.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://content.dropboxapi.com/2/files/upload',
				Buffer.from('binary'),
				{ arg: JSON.stringify({ mode: 'overwrite', path: '/image.png' }) },
				{ 'Content-Type': 'application/octet-stream' },
				{ json: false },
			);
		});

		it('copies a file', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'copy',
				path: '/a.txt',
				toPath: '/b.txt',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({
				metadata: { name: 'b.txt' },
			});

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/copy_v2',
				{ from_path: '/a.txt', to_path: '/b.txt' },
				{},
				{},
				undefined,
			);
			expect(result[0]).toEqual([{ json: { metadata: { name: 'b.txt' } } }]);
		});

		it('moves a file', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'move',
				path: '/a.txt',
				toPath: '/moved/a.txt',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({});

			await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/move_v2',
				{ from_path: '/a.txt', to_path: '/moved/a.txt' },
				{},
				{},
				undefined,
			);
		});
	});

	describe('Folder', () => {
		it('creates a folder', async () => {
			const mock = createMockExecuteFunction({
				resource: 'folder',
				operation: 'create',
				path: '/New Folder',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({});

			await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/create_folder_v2',
				{ path: '/New Folder' },
				{},
				{},
				undefined,
			);
		});

		it('deletes a folder', async () => {
			const mock = createMockExecuteFunction({
				resource: 'folder',
				operation: 'delete',
				path: '/Old Folder',
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({});

			await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/delete_v2',
				{ path: '/Old Folder' },
				{},
				{},
				undefined,
			);
		});

		it('lists a folder up to the given limit', async () => {
			const mock = createMockExecuteFunction({
				resource: 'folder',
				operation: 'list',
				path: '',
				returnAll: false,
				limit: 50,
				filters: { recursive: true },
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({
				entries: [
					{
						'.tag': 'file',
						id: 'id-1',
						name: 'report.pdf',
						size: 1024,
						server_modified: '2024-01-01T00:00:00Z',
						path_lower: '/report.pdf',
						path_display: '/Report.pdf',
					},
				],
				cursor: 'cursor-1',
				has_more: false,
			});

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/list_folder',
				{ path: '', limit: 50, recursive: true },
				{},
				{},
				undefined,
			);
			expect(result[0]).toEqual([
				{
					json: {
						id: 'id-1',
						name: 'report.pdf',
						type: 'file',
						contentSize: 1024,
						lastModifiedServer: '2024-01-01T00:00:00Z',
						pathLower: '/report.pdf',
						pathDisplay: '/Report.pdf',
					},
				},
			]);
		});

		it('lists all entries when returnAll is enabled', async () => {
			const mock = createMockExecuteFunction({
				resource: 'folder',
				operation: 'list',
				path: '',
				returnAll: true,
				filters: {},
			});
			(GenericFunctions.dropboxpiRequestAllItems as Mock).mockResolvedValue([
				{ id: 'id-1', name: 'a.txt' },
				{ id: 'id-2', name: 'b.txt' },
			]);

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxpiRequestAllItems).toHaveBeenCalledWith(
				'entries',
				'POST',
				'https://api.dropboxapi.com/2/files/list_folder',
				{ path: '', limit: 1000 },
				{},
				{},
			);
			expect(result[0]).toEqual([
				{ json: { id: 'id-1', name: 'a.txt' } },
				{ json: { id: 'id-2', name: 'b.txt' } },
			]);
		});
	});

	describe('Search', () => {
		it('queries with a limit and splits file extensions', async () => {
			const mock = createMockExecuteFunction({
				resource: 'search',
				operation: 'query',
				query: 'report',
				returnAll: false,
				limit: 10,
				simple: false,
				filters: { file_extensions: 'pdf,docx' },
			});
			const match = {
				match_type: { '.tag': 'filename' },
				metadata: { '.tag': 'file', file: { id: 'id-1', name: 'report.pdf' } },
			};
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({ matches: [match] });

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/search_v2',
				{
					query: 'report',
					options: { filename_only: true, file_extensions: ['pdf', 'docx'], max_results: 10 },
				},
				{},
				{},
				undefined,
			);
			expect(result[0]).toEqual([{ json: match }]);
		});

		it('queries and simplifies all matches when returnAll is enabled', async () => {
			const mock = createMockExecuteFunction({
				resource: 'search',
				operation: 'query',
				query: 'report',
				returnAll: true,
				simple: true,
				filters: {},
			});
			(GenericFunctions.dropboxpiRequestAllItems as Mock).mockResolvedValue([
				{
					match_type: { '.tag': 'filename' },
					metadata: { '.tag': 'file', file: { id: 'id-1', name: 'report.pdf' } },
				},
			]);

			const result = await dropbox.execute.call(mock);

			expect(GenericFunctions.dropboxpiRequestAllItems).toHaveBeenCalledWith(
				'matches',
				'POST',
				'https://api.dropboxapi.com/2/files/search_v2',
				{ query: 'report', options: { filename_only: true } },
				{},
				{},
			);
			expect(result[0]).toEqual([
				{ json: { id: 'id-1', name: 'report.pdf', match_type: 'filename' } },
			]);
		});
	});

	describe('Error handling', () => {
		it('throws a NodeOperationError for an unknown resource', async () => {
			const mock = createMockExecuteFunction({ resource: 'unknown-resource', operation: 'get' });

			await expect(dropbox.execute.call(mock)).rejects.toThrow(NodeOperationError);
		});

		it('returns the error message when continueOnFail is enabled', async () => {
			const mock = createMockExecuteFunction({
				resource: 'file',
				operation: 'delete',
				path: '/a.txt',
			});
			mock.continueOnFail.mockReturnValue(true);
			(GenericFunctions.dropboxApiRequest as Mock).mockRejectedValue(new Error('request failed'));

			const result = await dropbox.execute.call(mock);

			expect(result[0]).toEqual([{ json: { error: 'request failed' } }]);
		});
	});

	describe('Team access', () => {
		it('adds the team root header when the credential grants full access', async () => {
			const mock = createMockExecuteFunction({
				resource: 'folder',
				operation: 'create',
				path: '/New Folder',
			});
			mock.getCredentials.mockResolvedValue({ accessType: 'full' });
			(GenericFunctions.getRootDirectory as Mock).mockResolvedValue({
				root_info: { root_namespace_id: 'namespace-1' },
			});
			(GenericFunctions.dropboxApiRequest as Mock).mockResolvedValue({});

			await dropbox.execute.call(mock);

			expect(GenericFunctions.getRootDirectory).toHaveBeenCalled();
			expect(GenericFunctions.dropboxApiRequest).toHaveBeenCalledWith(
				'POST',
				'https://api.dropboxapi.com/2/files/create_folder_v2',
				{ path: '/New Folder' },
				{},
				{
					'dropbox-api-path-root': JSON.stringify({ '.tag': 'root', root: 'namespace-1' }),
				},
				undefined,
			);
		});
	});
});
