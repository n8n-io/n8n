import type { IExecuteFunctions, ILoadOptionsFunctions, INode, IPollFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { databricksApiRequest, getActiveCredentialType } from '../actions/helpers';

describe('databricksApiRequest', () => {
	let httpRequestWithAuthentication: Mock;
	let context: IExecuteFunctions;

	beforeEach(() => {
		httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		context = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			helpers: { httpRequestWithAuthentication },
		});
	});

	const capturedOptions = () =>
		httpRequestWithAuthentication.mock.calls[0][1] as Record<string, unknown>;

	it('should add the partner User-Agent alongside caller headers', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'PUT',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			headers: { 'Content-Type': 'application/octet-stream' },
		});

		expect(capturedOptions().headers).toEqual({
			'Content-Type': 'application/octet-stream',
			'User-Agent': 'n8n_DatabricksNode',
		});
	});

	it('should add headers when the caller supplies none', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
		});

		expect(capturedOptions().headers).toEqual({ 'User-Agent': 'n8n_DatabricksNode' });
	});

	it('should override a caller-supplied User-Agent', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
			headers: { 'User-Agent': 'something-else' },
		});

		expect(capturedOptions().headers).toEqual({ 'User-Agent': 'n8n_DatabricksNode' });
	});

	it('should pass non-header options through untouched', async () => {
		await databricksApiRequest(context, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			encoding: 'arraybuffer',
			returnFullResponse: true,
			qs: { page_token: 'abc' },
			json: true,
		});

		expect(capturedOptions()).toEqual({
			method: 'GET',
			url: 'https://example.databricks.com/api/2.0/fs/files/x',
			encoding: 'arraybuffer',
			returnFullResponse: true,
			qs: { page_token: 'abc' },
			json: true,
			headers: { 'User-Agent': 'n8n_DatabricksNode' },
		});
	});

	it('should forward the credential type and bind the call to the passed context', async () => {
		const loadOptionsContext = mock<ILoadOptionsFunctions>({
			getNode: () => mock<INode>({ typeVersion: 1 }),
			helpers: { httpRequestWithAuthentication },
		});

		await databricksApiRequest(loadOptionsContext, 'databricksOAuth2Api', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/volumes',
		});

		expect(httpRequestWithAuthentication.mock.calls[0][0]).toBe('databricksOAuth2Api');
		expect(httpRequestWithAuthentication.mock.instances[0]).toBe(loadOptionsContext);
	});
});

describe('getActiveCredentialType', () => {
	it('should read the authentication parameter of the given item on an execute context', () => {
		const context = mock<IExecuteFunctions>({ getInputData: vi.fn() });
		context.getNodeParameter.mockReturnValue('oAuth2');

		expect(getActiveCredentialType(context, 2)).toBe('databricksOAuth2Api');
		expect(context.getNodeParameter).toHaveBeenCalledWith('authentication', 2, 'accessToken');
	});

	it('should read the authentication parameter without an item index on a polling context', () => {
		const context = mock<IPollFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');

		expect(getActiveCredentialType(context)).toBe('databricksApi');
		expect(context.getNodeParameter).toHaveBeenCalledWith('authentication', 'accessToken');
	});
});
