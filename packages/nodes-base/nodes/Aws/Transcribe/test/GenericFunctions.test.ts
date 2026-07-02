import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, UserError } from 'n8n-workflow';

import type * as awsUtils from '../../../../credentials/common/aws/utils';

vi.mock('aws4', () => ({
	sign: vi.fn(),
}));

vi.mock('../../../../credentials/common/aws/utils', async () => {
	const actual = await vi.importActual<typeof awsUtils>('../../../../credentials/common/aws/utils');
	return { ...actual, assumeRole: vi.fn() };
});

import { sign } from 'aws4';

import { assumeRole } from '../../../../credentials/common/aws/utils';
import { awsApiRequest } from '../GenericFunctions';

describe('AWS Transcribe Generic Functions', () => {
	const mockSign = vi.mocked(sign);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('awsApiRequest region validation', () => {
		const buildContext = (region: unknown) => {
			const helpers = { request: vi.fn() };
			const context = mock<IExecuteFunctions>({
				getCredentials: vi.fn().mockResolvedValue({
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
				UserError,
			);
			await expect(awsApiRequest.call(context, 'transcribe', 'POST', '/')).rejects.toThrow(
				'Unsupported AWS region',
			);

			expect(mockSign).not.toHaveBeenCalled();
			expect(helpers.request).not.toHaveBeenCalled();
		});
	});

	describe('awsApiRequest authentication selection', () => {
		const mockAssumeRole = vi.mocked(assumeRole);

		const buildContext = (authentication: string | undefined, credentials: object) => {
			const helpers = { request: vi.fn().mockResolvedValue('{}') };
			const context = mock<IExecuteFunctions>({
				getNodeParameter: vi.fn().mockReturnValue(authentication),
				getCredentials: vi.fn().mockResolvedValue(credentials),
				helpers: helpers as never,
			});
			return { context, helpers };
		};

		it('signs with the static keys when authentication is iam', async () => {
			const { context, helpers } = buildContext('iam', {
				region: 'us-east-1',
				accessKeyId: 'AKIA-test',
				secretAccessKey: 'secret-test',
			});

			await awsApiRequest.call(context, 'transcribe', 'POST', '/');

			expect(context.getCredentials).toHaveBeenCalledWith('aws');
			expect(mockAssumeRole).not.toHaveBeenCalled();
			expect(mockSign).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ accessKeyId: 'AKIA-test', secretAccessKey: 'secret-test' }),
			);
			expect(helpers.request).toHaveBeenCalledTimes(1);
		});

		it('includes the session token when iam credentials are temporary', async () => {
			const { context, helpers } = buildContext('iam', {
				region: 'us-east-1',
				accessKeyId: 'AKIA-test',
				secretAccessKey: 'secret-test',
				temporaryCredentials: true,
				sessionToken: 'session-token-test',
			});

			await awsApiRequest.call(context, 'transcribe', 'POST', '/');

			expect(context.getCredentials).toHaveBeenCalledWith('aws');
			expect(mockAssumeRole).not.toHaveBeenCalled();
			expect(mockSign).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					accessKeyId: 'AKIA-test',
					secretAccessKey: 'secret-test',
					sessionToken: 'session-token-test',
				}),
			);
			expect(helpers.request).toHaveBeenCalledTimes(1);
		});

		it('resolves credentials via assumeRole and signs with the temporary credentials', async () => {
			const temporaryCredentials = {
				accessKeyId: 'ASIA-temp',
				secretAccessKey: 'temp-secret',
				sessionToken: 'temp-token',
			};
			mockAssumeRole.mockResolvedValue(temporaryCredentials);

			const assumeRoleCredentials = {
				region: 'us-east-1',
				roleArn: 'arn:aws:iam::123456789012:role/MyRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				stsAccessKeyId: 'AKIA-sts',
				stsSecretAccessKey: 'sts-secret',
			};
			const { context, helpers } = buildContext('assumeRole', assumeRoleCredentials);

			await awsApiRequest.call(context, 'transcribe', 'POST', '/');

			expect(context.getCredentials).toHaveBeenCalledWith('awsAssumeRole');
			expect(mockAssumeRole).toHaveBeenCalledWith(assumeRoleCredentials, 'us-east-1');
			expect(mockSign).toHaveBeenCalledWith(expect.anything(), temporaryCredentials);
			expect(helpers.request).toHaveBeenCalledTimes(1);
		});

		it('wraps an assumeRole failure in a NodeApiError without signing or sending', async () => {
			mockAssumeRole.mockRejectedValue(new UserError('STS failure'));

			const assumeRoleCredentials = {
				region: 'us-east-1',
				roleArn: 'arn:aws:iam::123456789012:role/MyRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
			};
			const { context, helpers } = buildContext('assumeRole', assumeRoleCredentials);

			await expect(awsApiRequest.call(context, 'transcribe', 'POST', '/')).rejects.toThrow(
				NodeApiError,
			);

			expect(mockSign).not.toHaveBeenCalled();
			expect(helpers.request).not.toHaveBeenCalled();
		});
	});
});
