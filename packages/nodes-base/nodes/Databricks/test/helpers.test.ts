import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { databricksApiRequest } from '../actions/helpers';
import { databricksUserAgent } from '../constants';

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
		// `fetchResourcesInSchema` in methods/listSearch.ts passes a context object
		// rather than `this`, so the receiver must come from the argument.
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

	it('should track the integration version rather than the node typeVersion', async () => {
		// A node instance pinned to an older typeVersion must still report the version
		// of the integration that is actually running.
		const staleContext = mock<IExecuteFunctions>({
			getNode: () => mock<INode>({ typeVersion: 0.1 }),
			helpers: { httpRequestWithAuthentication },
		});

		await databricksApiRequest(staleContext, 'databricksApi', {
			method: 'GET',
			url: 'https://example.databricks.com/api/2.1/unity-catalog/catalogs',
		});

		expect(capturedOptions().headers).toEqual({
			'User-Agent': databricksUserAgent(),
		});
	});

	it('should send the unversioned partner User-Agent', () => {
		expect(databricksUserAgent()).toBe('n8n_DatabricksNode');
	});
});
