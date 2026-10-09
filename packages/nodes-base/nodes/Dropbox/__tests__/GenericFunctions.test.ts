import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	dropboxApiRequest,
	dropboxpiRequestAllItems,
	getCredentials,
	getRootDirectory,
	simplify,
} from '../GenericFunctions';

describe('Dropbox, GenericFunctions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('dropboxApiRequest', () => {
		it('sends the request with the access token credential', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({ ok: true });

			const response = await dropboxApiRequest.call(
				executeFunctions,
				'POST',
				'https://api.dropboxapi.com/2/test',
				{ key: 'value' },
				{ query: '1' },
				{ 'x-header': 'yes' },
			);

			expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'dropboxApi',
				{
					headers: { 'x-header': 'yes' },
					method: 'POST',
					qs: { query: '1' },
					body: { key: 'value' },
					uri: 'https://api.dropboxapi.com/2/test',
					json: true,
				},
			);
			expect(response).toEqual({ ok: true });
		});

		it('sends the request with the OAuth2 credential', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter.calledWith('authentication', 0).mockReturnValue('oAuth2');
			executeFunctions.helpers.requestOAuth2.mockResolvedValue({ ok: true });

			await dropboxApiRequest.call(
				executeFunctions,
				'GET',
				'https://api.dropboxapi.com/2/test',
				{},
			);

			expect(executeFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'dropboxOAuth2Api',
				expect.objectContaining({ method: 'GET', json: true }),
			);
		});

		it('removes the body when it is empty', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({});

			await dropboxApiRequest.call(
				executeFunctions,
				'GET',
				'https://api.dropboxapi.com/2/test',
				{},
			);

			const options = (executeFunctions.helpers.requestWithAuthentication as Mock).mock.calls[0][1];
			expect(options.body).toBeUndefined();
		});

		it('overrides options with the supplied option object', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({});

			await dropboxApiRequest.call(
				executeFunctions,
				'POST',
				'https://api.dropboxapi.com/2/test',
				{ key: 'value' },
				{},
				{},
				{ json: false, encoding: null },
			);

			const options = (executeFunctions.helpers.requestWithAuthentication as Mock).mock.calls[0][1];
			expect(options.json).toBe(false);
			expect(options.encoding).toBeNull();
		});

		it('wraps request errors in a NodeApiError', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.helpers.requestWithAuthentication.mockRejectedValue(new Error('boom'));

			await expect(
				dropboxApiRequest.call(executeFunctions, 'GET', 'https://api.dropboxapi.com/2/test', {}),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('dropboxpiRequestAllItems', () => {
		it('follows the folder cursor until has_more is false', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.getNodeParameter.calledWith('resource', 0).mockReturnValue('folder');
			executeFunctions.helpers.requestWithAuthentication
				.mockResolvedValueOnce({
					entries: [{ id: '1' }],
					cursor: 'cursor-1',
					has_more: true,
				})
				.mockResolvedValueOnce({
					entries: [{ id: '2' }],
					cursor: 'cursor-2',
					has_more: false,
				});

			const response = await dropboxpiRequestAllItems.call(
				executeFunctions,
				'entries',
				'POST',
				'https://api.dropboxapi.com/2/files/list_folder',
				{ path: '' },
			);

			expect(response).toEqual([{ id: '1' }, { id: '2' }]);

			const calls = (executeFunctions.helpers.requestWithAuthentication as Mock).mock.calls;
			expect(calls[0][1].uri).toBe('https://api.dropboxapi.com/2/files/list_folder');
			expect(calls[1][1].uri).toBe('https://api.dropboxapi.com/2/files/list_folder/continue');
			expect(calls[1][1].body).toEqual({ cursor: 'cursor-1' });
		});

		it('follows the search cursor for the search resource', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.getNodeParameter.calledWith('resource', 0).mockReturnValue('search');
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValueOnce({
				matches: [{ id: '1' }],
				cursor: 'cursor-1',
				has_more: true,
			});
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValueOnce({
				matches: [{ id: '2' }],
				has_more: false,
			});

			const response = await dropboxpiRequestAllItems.call(
				executeFunctions,
				'matches',
				'POST',
				'https://api.dropboxapi.com/2/files/search_v2',
				{ query: 'report' },
			);

			expect(response).toEqual([{ id: '1' }, { id: '2' }]);

			const calls = (executeFunctions.helpers.requestWithAuthentication as Mock).mock.calls;
			expect(calls[1][1].uri).toBe('https://api.dropboxapi.com/2/files/search/continue_v2');
			expect(calls[1][1].body).toEqual({ cursor: 'cursor-1' });
		});
	});

	describe('getRootDirectory', () => {
		it('requests the current account', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({
				root_info: { root_namespace_id: 'namespace-1' },
			});

			const response = await getRootDirectory.call(executeFunctions);

			expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'dropboxApi',
				expect.objectContaining({
					method: 'POST',
					uri: 'https://api.dropboxapi.com/2/users/get_current_account',
				}),
			);
			expect(response).toEqual({ root_info: { root_namespace_id: 'namespace-1' } });
		});
	});

	describe('getCredentials', () => {
		it('returns the access token credentials', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter
				.calledWith('authentication', 0)
				.mockReturnValue('accessToken');
			executeFunctions.getCredentials.mockResolvedValue({ accessType: 'full' });

			const credentials = await getCredentials.call(executeFunctions);

			expect(executeFunctions.getCredentials).toHaveBeenCalledWith('dropboxApi');
			expect(credentials).toEqual({ accessType: 'full' });
		});

		it('returns the OAuth2 credentials', async () => {
			const executeFunctions = mockDeep<IExecuteFunctions>();
			executeFunctions.getNodeParameter.calledWith('authentication', 0).mockReturnValue('oAuth2');
			executeFunctions.getCredentials.mockResolvedValue({ accessType: 'private' });

			await getCredentials.call(executeFunctions);

			expect(executeFunctions.getCredentials).toHaveBeenCalledWith('dropboxOAuth2Api');
		});
	});

	describe('simplify', () => {
		it('flattens the metadata wrapper and the match type tag', () => {
			const data = [
				{
					match_type: { '.tag': 'filename' },
					metadata: {
						'.tag': 'file',
						file: { id: 'id-1', name: 'report.pdf' },
					},
				},
			];

			const response = simplify(data);

			expect(response).toEqual([
				{
					match_type: 'filename',
					id: 'id-1',
					name: 'report.pdf',
				},
			]);
			expect(data[0]).not.toHaveProperty('metadata');
		});

		it('leaves the match type untouched when it has no tag', () => {
			const data = [
				{
					match_type: {},
					metadata: {
						'.tag': 'folder',
						folder: { id: 'id-2', name: 'Invoices' },
					},
				},
			];

			const response = simplify(data);

			expect(response).toEqual([{ match_type: {}, id: 'id-2', name: 'Invoices' }]);
		});
	});
});
