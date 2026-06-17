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
		expect(requestArg.uri).toBe('https://graph.facebook.com/v23.0/123456/photos');
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

	it('does not attach formData when Send Binary File is disabled', async () => {
		setParams({ sendBinaryData: false });

		await node.execute.call(mockExecuteFunctions);

		const requestArg = (mockExecuteFunctions.helpers.request as Mock).mock.calls[0][0];
		expect(requestArg.formData).toBeUndefined();
		expect(mockExecuteFunctions.helpers.assertBinaryData).not.toHaveBeenCalled();
		expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
	});
});
