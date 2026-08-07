import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { awsApiRequestREST } from '../../V2/GenericFunctions';
import * as AwsGenericFunctions from '../../../GenericFunctions';

describe('AWS S3 V2 GenericFunctions', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(AwsGenericFunctions, 'getAwsCredentials').mockResolvedValue({
			credentialsType: 'awsS3Api',
		} as any);
	});

	describe('awsApiRequestREST', () => {
		it('should handle empty string response (e.g. HTTP 204)', async () => {
			const executeFunctionsMock = mock<IExecuteFunctions>({
				helpers: {
					requestWithAuthentication: vi.fn().mockResolvedValue(''),
				},
			});

			const response = await awsApiRequestREST.call(
				executeFunctionsMock,
				's3',
				'DELETE',
				'/my-bucket',
			);

			expect(response).toBe('');
		});

		it('should handle undefined response (e.g. HTTP 204)', async () => {
			const executeFunctionsMock = mock<IExecuteFunctions>({
				helpers: {
					requestWithAuthentication: vi.fn().mockResolvedValue(undefined),
				},
			});

			const response = await awsApiRequestREST.call(
				executeFunctionsMock,
				's3',
				'DELETE',
				'/my-bucket',
			);

			expect(response).toBeUndefined();
		});
	});
});
