import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { IBinaryData, IExecuteFunctions } from 'n8n-workflow';

import { FacebookGraphApi } from '../FacebookGraphApi.node';
import type { Mock } from 'vitest';

describe('FacebookGraphApi node — binary upload', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let node: FacebookGraphApi;

	const binaryDataBuffer = Buffer.from('fake-image-bytes');
	const binaryDescriptor: IBinaryData = {
		data: 'base64data',
		mimeType: 'image/png',
		fileName: 'photo.png',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		node = new FacebookGraphApi();

		mockExecuteFunctions.getInputData.mockReturnValue([
			{ json: {}, binary: { data: binaryDescriptor } },
		]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Facebook Graph API',
			type: 'n8n-nodes-base.facebookGraphApi',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({ accessToken: 'TOKEN' });
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.helpers = {
			request: vi.fn().mockResolvedValue({ id: 'photo-id' }),
			requestWithAuthentication: vi.fn(),
			assertBinaryData: vi.fn().mockReturnValue(binaryDescriptor),
			getBinaryDataBuffer: vi.fn().mockResolvedValue(binaryDataBuffer),
		} as any;
	});

	const setParams = (overrides: Record<string, unknown> = {}) => {
		const defaults: Record<string, unknown> = {
			authType: 'accessToken',
			hostUrl: 'graph.facebook.com',
			httpRequestMethod: 'POST',
			graphApiVersion: 'v23.0',
			node: '123456',
			edge: 'photos',
			options: {},
			sendBinaryData: true,
			binaryPropertyName: 'data',
			allowUnauthorizedCerts: false,
		};
		const params = { ...defaults, ...overrides };
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(name: string) => params[name] as never,
		);
	};

	it('builds a multipart/form-data request with the binary buffer when Send Binary File is enabled', async () => {
		setParams();

		await node.execute.call(mockExecuteFunctions);

		const requestMock = mockExecuteFunctions.helpers.request as Mock;
		expect(requestMock).toHaveBeenCalledTimes(1);

		const requestArg = requestMock.mock.calls[0][0];
		expect(requestArg.method).toBe('POST');
		expect(String(requestArg.uri)).toBe('https://graph.facebook.com/v23.0/123456/photos');
		expect(requestArg.formData).toEqual({
			file: {
				value: binaryDataBuffer,
				options: {
					filename: 'photo.png',
					contentType: 'image/png',
				},
			},
		});
		// Buffer must NOT be JSON-serialized into the body.
		expect(requestArg.body).toBeUndefined();
		expect(requestArg.json).toBe(true);
	});

	it('respects the "<formField>:<binaryProperty>" syntax for the form field name', async () => {
		setParams({ binaryPropertyName: 'source:data' });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(Object.keys(requestArg.formData)).toEqual(['source']);
		expect(requestArg.formData.source.value).toBe(binaryDataBuffer);
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
	});

	it.each([
		['', '', 'https://graph.facebook.com/me'],
		['', 'photos', 'https://graph.facebook.com/me/photos'],
		['v23.0', '', 'https://graph.facebook.com/v23.0/me'],
	])(
		'builds the request URL for version "%s" and edge "%s"',
		async (graphApiVersion, edge, expected) => {
			setParams({ sendBinaryData: false, graphApiVersion, node: 'me', edge });

			await node.execute.call(mockExecuteFunctions);

			const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(String(requestArg.uri)).toBe(expected);
		},
	);

	it.each([
		['', 'https://graph.facebook.com/'],
		['v23.0', 'https://graph.facebook.com/v23.0/'],
	])(
		'builds the root URL for an empty node and version "%s"',
		async (graphApiVersion, expected) => {
			setParams({ sendBinaryData: false, graphApiVersion, node: '', edge: '' });

			await node.execute.call(mockExecuteFunctions);

			const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(String(requestArg.uri)).toBe(expected);
		},
	);

	it.each(['..', 'me/..', '123/../me'])(
		'returns an error item for the invalid node "%s" when continueOnFail is enabled',
		async (nodeValue) => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			setParams({ sendBinaryData: false, node: nodeValue });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
			expect(result[0][0].error).toBeDefined();
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		},
	);

	it.each([
		['me/feed', '', 'https://graph.facebook.com/v23.0/me/feed'],
		['me/', '', 'https://graph.facebook.com/v23.0/me/'],
		['me//feed', '', 'https://graph.facebook.com/v23.0/me//feed'],
		['me/accounts', 'photos', 'https://graph.facebook.com/v23.0/me/accounts/photos'],
		['me/feed?debug=all', '', 'https://graph.facebook.com/v23.0/me/feed%3Fdebug=all'],
		['me', 'insights/page_fans', 'https://graph.facebook.com/v23.0/me/insights%2Fpage_fans'],
	])('builds the request URL for node "%s" and edge "%s"', async (nodeValue, edge, expected) => {
		setParams({ sendBinaryData: false, node: nodeValue, edge });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(String(requestArg.uri)).toBe(expected);
	});

	it.each([
		[1, 'a%2Fb%20c', 'https://graph.facebook.com/v23.0/a%2Fb%20c/x%20y'],
		[1.1, 'a%2Fb%20c', 'https://graph.facebook.com/v23.0/a%252Fb%2520c/x%2520y'],
	])(
		'sends the node and edge as entered for version %s',
		async (typeVersion, nodeValue, expected) => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockExecuteFunctions.getNode(),
				typeVersion,
			});
			setParams({ sendBinaryData: false, node: nodeValue, edge: 'x%20y' });

			await node.execute.call(mockExecuteFunctions);

			const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(String(requestArg.uri)).toBe(expected);
		},
	);

	it.each(['graph.facebook.com', 'graph-video.facebook.com'])(
		'sends the request to the supported Host URL "%s"',
		async (hostUrl) => {
			setParams({ sendBinaryData: false, hostUrl });

			await node.execute.call(mockExecuteFunctions);

			const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
			expect(String(requestArg.uri)).toBe(`https://${hostUrl}/v23.0/123456/photos`);
		},
	);

	it.each(['other.example', 'graph.facebook.com.other.example', ''])(
		'throws and sends no request for the unsupported Host URL "%s"',
		async (hostUrl) => {
			setParams({ sendBinaryData: false, hostUrl });

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();

			expect(mockExecuteFunctions.helpers.request).not.toHaveBeenCalled();
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		},
	);

	it.each([
		[1, 'https://graph.facebook.com/v23.0/1234567890'],
		[1.1, 'https://graph.facebook.com/v23.0/1234567890'],
	])('accepts a numeric node value for version %s', async (typeVersion, expected) => {
		mockExecuteFunctions.getNode.mockReturnValue({
			...mockExecuteFunctions.getNode(),
			typeVersion,
		});
		setParams({ sendBinaryData: false, node: 1234567890, edge: '' });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(String(requestArg.uri)).toBe(expected);
	});

	it('accepts a numeric edge value for version 1', async () => {
		setParams({ sendBinaryData: false, node: 'me', edge: 123 });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(String(requestArg.uri)).toBe('https://graph.facebook.com/v23.0/me/123');
	});

	it.each([
		[1, null],
		[1, undefined],
		[1.1, null],
		[1.1, undefined],
	])('sends the request to the node only for version %s and edge %s', async (typeVersion, edge) => {
		mockExecuteFunctions.getNode.mockReturnValue({
			...mockExecuteFunctions.getNode(),
			typeVersion,
		});
		setParams({ sendBinaryData: false, node: 'me', edge });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(String(requestArg.uri)).toBe('https://graph.facebook.com/v23.0/me');
	});

	it('keeps ":" in the node unencoded when no version is set', async () => {
		setParams({ sendBinaryData: false, graphApiVersion: '', node: 'page:123', edge: '' });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(String(requestArg.uri)).toBe('https://graph.facebook.com/page:123');
	});

	it('does not attach formData when Send Binary File is disabled', async () => {
		setParams({ sendBinaryData: false });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(requestArg.formData).toBeUndefined();
		expect(mockExecuteFunctions.helpers.assertBinaryData).not.toHaveBeenCalled();
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
	});
});

describe('FacebookGraphApi node — error handling', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;
	let node: FacebookGraphApi;

	beforeEach(() => {
		vi.clearAllMocks();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		node = new FacebookGraphApi();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Facebook Graph API',
			type: 'n8n-nodes-base.facebookGraphApi',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		mockExecuteFunctions.getCredentials.mockResolvedValue({ accessToken: 'TOKEN' });
		mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
			const params: Record<string, unknown> = {
				authType: 'accessToken',
				hostUrl: 'graph.facebook.com',
				httpRequestMethod: 'GET',
				graphApiVersion: 'v23.0',
				node: '123456',
				edge: 'feed',
				options: {},
				sendBinaryData: false,
			};
			return params[name] as never;
		});
	});

	it('throws when the request fails and continueOnFail is disabled', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.helpers = {
			request: vi.fn().mockRejectedValue({ statusCode: 400 }),
		} as never;

		await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow();
	});

	it('routes the failed item to the error output when continueOnFail is enabled', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.helpers = {
			request: vi.fn().mockRejectedValue({
				statusCode: 400,
				response: {
					body: { error: { message: 'Invalid token', type: 'OAuthException', code: 190 } },
					headers: { 'x-fb-trace-id': 'abc' },
				},
			}),
		} as never;

		const result = await node.execute.call(mockExecuteFunctions);

		const item = result[0][0];
		// The engine routes an item to the error output only when `error` is set,
		// and needs `pairedItem` to resolve the originating input item.
		expect(item.error).toBeDefined();
		expect(item.pairedItem).toEqual({ item: 0 });
		// The Graph API error detail is still preserved on the item.
		expect(item.json).toMatchObject({ statusCode: 400, message: 'Invalid token', code: 190 });
	});

	it('marks a non-JSON string response as an error item when continueOnFail is enabled', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.helpers = {
			request: vi.fn().mockResolvedValue('<html>not json</html>'),
		} as never;

		const result = await node.execute.call(mockExecuteFunctions);

		const item = result[0][0];
		expect(item.error).toBeDefined();
		expect(item.pairedItem).toEqual({ item: 0 });
		expect(item.json).toEqual({ message: '<html>not json</html>' });
	});
});
