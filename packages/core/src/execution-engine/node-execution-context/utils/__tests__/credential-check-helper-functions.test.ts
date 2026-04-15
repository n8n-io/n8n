import type {
	IWorkflowExecuteAdditionalData,
	DynamicCredentialCheckProxyProvider,
} from 'n8n-workflow';

import { getCredentialCheckHelperFunctions } from '../credential-check-helper-functions';

describe('getCredentialCheckHelperFunctions', () => {
	it('should return empty object when dynamic-credentials is not available', () => {
		const additionalData = {} as IWorkflowExecuteAdditionalData;

		const result = getCredentialCheckHelperFunctions(additionalData);

		expect(result).toEqual({});
	});

	it('should return checkCredentialStatus when credentialCheckProxy is available', async () => {
		const mockResult = { readyToExecute: true, credentials: [] };
		const mockProxy: DynamicCredentialCheckProxyProvider = {
			checkCredentialStatus: jest.fn().mockResolvedValue(mockResult),
		};

		const additionalData = {
			'dynamic-credentials': { credentialCheckProxy: mockProxy },
		} as unknown as IWorkflowExecuteAdditionalData;

		const result = getCredentialCheckHelperFunctions(additionalData);

		expect(result.checkCredentialStatus).toBeDefined();

		const status = await result.checkCredentialStatus!('wf-1', {
			version: 1,
			establishedAt: Date.now(),
			source: 'webhook',
		});

		expect(status).toEqual(mockResult);
		expect(mockProxy.checkCredentialStatus).toHaveBeenCalledWith('wf-1', expect.any(Object));
	});
});
