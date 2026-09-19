import type { IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	apiTemplateIoApiRequest,
	apiTemplateIoApiRequestV2,
	downloadImage,
	loadResource,
	validateJSON,
} from '../GenericFunctions';

const node = mock<INode>({ name: 'APITemplate.io', typeVersion: 2 });

describe('APITemplate.io -> GenericFunctions', () => {
	const httpRequestWithAuthentication = vi.fn();
	const httpRequest = vi.fn();

	const context = {
		getNode: () => node,
		helpers: { httpRequestWithAuthentication, httpRequest },
	} as unknown as IExecuteFunctions & ILoadOptionsFunctions;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('apiTemplateIoApiRequest', () => {
		it('should send a request to the V1 base URL and return the response', async () => {
			const response = { credits: 100 };
			httpRequestWithAuthentication.mockResolvedValue(response);

			const result = await apiTemplateIoApiRequest.call(context, 'GET', '/account-information');

			expect(result).toEqual(response);
			expect(httpRequestWithAuthentication).toHaveBeenCalledWith('apiTemplateIoApi', {
				headers: { Accept: 'application/json' },
				url: 'https://api.apitemplate.io/v1/account-information',
				method: 'GET',
				json: true,
			});
		});

		it('should pass through the query string and body when they are not empty', async () => {
			httpRequestWithAuthentication.mockResolvedValue({ status: 'success' });

			await apiTemplateIoApiRequest.call(
				context,
				'POST',
				'/create',
				{ template_id: 'tpl-1' },
				{ name: 'John' },
			);

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
				'apiTemplateIoApi',
				expect.objectContaining({
					method: 'POST',
					qs: { template_id: 'tpl-1' },
					body: { name: 'John' },
				}),
			);
		});

		it('should surface the API error message when the API reports an error status', async () => {
			httpRequestWithAuthentication.mockResolvedValue({
				status: 'error',
				message: 'Template not found',
			});

			await expect(
				apiTemplateIoApiRequest.call(context, 'GET', '/account-information'),
			).rejects.toThrow(expect.objectContaining({ message: 'Template not found' }));
		});

		it('should wrap transport errors in a NodeApiError', async () => {
			httpRequestWithAuthentication.mockRejectedValue(new Error('socket hang up'));

			await expect(
				apiTemplateIoApiRequest.call(context, 'GET', '/account-information'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('apiTemplateIoApiRequestV2', () => {
		it.each([
			'rest',
			'rest-au',
			'rest-de',
			'rest-us',
			'rest-alt',
			'rest-alt-de',
			'rest-alt-us',
			'rest-staging',
		])('should route the request to the %s endpoint', async (region) => {
			httpRequestWithAuthentication.mockResolvedValue({ status: 'success' });

			await apiTemplateIoApiRequestV2.call(context, 'GET', region, '/v2/account-information');

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
				'apiTemplateIoApi',
				expect.objectContaining({
					url: `https://${region}.apitemplate.io/v2/account-information`,
				}),
			);
		});

		it('should request JSON and send the body as an object by default', async () => {
			httpRequestWithAuthentication.mockResolvedValue({ status: 'success' });

			await apiTemplateIoApiRequestV2.call(
				context,
				'POST',
				'rest',
				'/v2/create-pdf',
				{ template_id: 'tpl-1' },
				{ name: 'John' },
			);

			expect(httpRequestWithAuthentication).toHaveBeenCalledWith('apiTemplateIoApi', {
				headers: { 'user-agent': 'n8n', Accept: 'application/json' },
				url: 'https://rest.apitemplate.io/v2/create-pdf',
				method: 'POST',
				qs: { template_id: 'tpl-1' },
				json: true,
				body: { name: 'John' },
			});
		});

		it('should ask for a raw buffer and serialise the body when returnBinary is set', async () => {
			httpRequestWithAuthentication.mockResolvedValue(Buffer.from('%PDF-1.4'));

			const result = await apiTemplateIoApiRequestV2.call(
				context,
				'POST',
				'rest',
				'/v2/create-pdf',
				{ export_type: 'file' },
				{ name: 'John' },
				true,
			);

			expect(result).toEqual(Buffer.from('%PDF-1.4'));
			expect(httpRequestWithAuthentication).toHaveBeenCalledWith('apiTemplateIoApi', {
				headers: { 'user-agent': 'n8n', 'Content-Type': 'application/json' },
				url: 'https://rest.apitemplate.io/v2/create-pdf',
				method: 'POST',
				qs: { export_type: 'file' },
				json: false,
				encoding: 'arraybuffer',
				body: JSON.stringify({ name: 'John' }),
			});
		});

		it('should omit an empty query string and body', async () => {
			httpRequestWithAuthentication.mockResolvedValue({ status: 'success' });

			await apiTemplateIoApiRequestV2.call(context, 'GET', 'rest', '/v2/account-information');

			const [, options] = httpRequestWithAuthentication.mock.calls[0];
			expect(options).not.toHaveProperty('qs');
			expect(options).not.toHaveProperty('body');
		});

		it('should surface the API error message when the API reports an error status', async () => {
			httpRequestWithAuthentication.mockResolvedValue({
				status: 'error',
				message: 'Invalid template id',
			});

			await expect(
				apiTemplateIoApiRequestV2.call(context, 'POST', 'rest', '/v2/create-pdf'),
			).rejects.toThrow(expect.objectContaining({ message: 'Invalid template id' }));
		});

		it('should not inspect the response status when returning binary data', async () => {
			// A PDF buffer can contain anything, including a `status` key, so the
			// JSON error check must not run against it
			const buffer = Buffer.from('%PDF-1.4');
			Object.assign(buffer, { status: 'error' });
			httpRequestWithAuthentication.mockResolvedValue(buffer);

			const result = await apiTemplateIoApiRequestV2.call(
				context,
				'POST',
				'rest',
				'/v2/create-pdf',
				{},
				{},
				true,
			);

			expect(result).toBe(buffer);
		});

		it('should wrap transport errors in a NodeApiError', async () => {
			httpRequestWithAuthentication.mockRejectedValue(new Error('socket hang up'));

			await expect(
				apiTemplateIoApiRequestV2.call(context, 'POST', 'rest', '/v2/create-pdf'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('downloadImage', () => {
		it('should download the file as a buffer', async () => {
			const buffer = Buffer.from('image-bytes');
			httpRequest.mockResolvedValue(buffer);

			const result = await downloadImage.call(context, 'https://cdn.apitemplate.io/file.png');

			expect(result).toBe(buffer);
			expect(httpRequest).toHaveBeenCalledWith({
				url: 'https://cdn.apitemplate.io/file.png',
				method: 'GET',
				json: false,
				encoding: 'arraybuffer',
			});
		});
	});

	describe('loadResource', () => {
		const templates = [
			{ id: 'tpl-pdf', name: 'Invoice', format: 'PDF' },
			{ id: 'tpl-png', name: 'Banner', format: 'PNG' },
			{ id: 'tpl-jpeg', name: 'Cover', format: 'JPEG' },
		];

		it('should return only image templates', async () => {
			httpRequestWithAuthentication.mockResolvedValue(templates);

			const result = await loadResource.call(context, 'image');

			expect(result).toEqual([
				{ name: 'Banner (PNG)', value: 'tpl-png' },
				{ name: 'Cover (JPEG)', value: 'tpl-jpeg' },
			]);
		});

		it('should return only PDF templates', async () => {
			httpRequestWithAuthentication.mockResolvedValue(templates);

			const result = await loadResource.call(context, 'pdf');

			expect(result).toEqual([{ name: 'Invoice (PDF)', value: 'tpl-pdf' }]);
		});
	});

	describe('validateJSON', () => {
		it('should return objects unchanged', () => {
			const value = { name: 'John' };
			expect(validateJSON(value)).toBe(value);
		});

		it('should parse a JSON object', () => {
			expect(validateJSON('{"name": "John"}')).toEqual({ name: 'John' });
		});

		it('should parse a JSON array', () => {
			expect(validateJSON('[{"name": "text_1"}]')).toEqual([{ name: 'text_1' }]);
		});

		it('should return undefined for malformed JSON', () => {
			expect(validateJSON('{name: John}')).toBeUndefined();
		});

		it('should return undefined when no value is given', () => {
			expect(validateJSON(undefined)).toBeUndefined();
		});
	});
});
