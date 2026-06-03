import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

jest.mock('aws4', () => ({
	sign: jest.fn(),
}));

import { sign } from 'aws4';
import { awsApiRequest } from '../GenericFunctions';

describe('AWS Transcribe Generic Functions', () => {
	const mockSign = sign as jest.MockedFunction<typeof sign>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('awsApiRequest region validation', () => {
		const buildContext = (region: unknown) => {
			const helpers = { request: jest.fn() };
			const context = mock<IExecuteFunctions>({
				getCredentials: jest.fn().mockResolvedValue({
					region,
					accessKeyId: 'AKIA-test',
					secretAccessKey: 'secret-test',
				}),
				helpers: helpers as never,
			});
			return { context, helpers };
		};

		it.each(['us-east-1', 'eu-west-1', 'ap-southeast-2'])(
			'accepts the supported region %s and proceeds to sign and send',
			async (region) => {
				const { context, helpers } = buildContext(region);
				helpers.request.mockResolvedValue('{}');

				await awsApiRequest.call(context, 'transcribe', 'POST', '/');

				expect(mockSign).toHaveBeenCalledTimes(1);
				expect(helpers.request).toHaveBeenCalledTimes(1);
				const requestArg = helpers.request.mock.calls[0][0];
				expect(new URL(requestArg.uri).host).toBe(`transcribe.${region}.amazonaws.com`);
			},
		);

		it.each([
			'@example.com#',
			'us-fake-1',
			'',
			'us-east-1/foo',
			'us-east-1#frag',
			'us-east-1:8080',
			' us-east-1 ',
		])('rejects unsupported region value %s without signing or sending', async (region) => {
			const { context, helpers } = buildContext(region);

			await expect(awsApiRequest.call(context, 'transcribe', 'POST', '/')).rejects.toThrow(
				ApplicationError,
			);
			await expect(awsApiRequest.call(context, 'transcribe', 'POST', '/')).rejects.toThrow(
				'Unsupported AWS region',
			);

			expect(mockSign).not.toHaveBeenCalled();
			expect(helpers.request).not.toHaveBeenCalled();
		});
	});
});
