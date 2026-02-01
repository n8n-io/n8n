import { mock } from 'jest-mock-extended';
import { LoggerProxy } from 'n8n-workflow';
import type { IDataObject, IRunExecutionData, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID } from '@/constants';
import type { ExternalSecretsProxy } from '@/execution-engine/external-secrets-proxy';

import { getAdditionalKeys } from '../get-additional-keys';

describe('getAdditionalKeys', () => {
	const externalSecretsProxy = mock<ExternalSecretsProxy>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: '123',
		webhookWaitingBaseUrl: 'https://webhook.test',
		formWaitingBaseUrl: 'https://form.test',
		variables: { testVar: 'value' },
		externalSecretsProxy,
	});

	const runExecutionData = mock<IRunExecutionData>({
		resultData: {
			runData: {},
			metadata: {},
		},
	});

	beforeAll(() => {
		LoggerProxy.init(mock());
		externalSecretsProxy.hasProvider.mockReturnValue(true);
		externalSecretsProxy.hasSecret.mockReturnValue(true);
		externalSecretsProxy.getSecret.mockReturnValue('secret-value');
		externalSecretsProxy.listSecrets.mockReturnValue(['secret1']);
		externalSecretsProxy.listProviders.mockReturnValue(['provider1']);
	});

	it('should use placeholder execution ID when none provided', () => {
		const noIdData = { ...additionalData, executionId: undefined };
		const result = getAdditionalKeys(noIdData, 'manual', null);

		expect(result.$execution?.id).toBe(PLACEHOLDER_EMPTY_EXECUTION_ID);
	});

	it('should return production mode when not manual', () => {
		const result = getAdditionalKeys(additionalData, 'internal', null);

		expect(result.$execution?.mode).toBe('production');
	});

	it('should include customData methods when runExecutionData is provided', () => {
		const result = getAdditionalKeys(additionalData, 'manual', runExecutionData);

		expect(result.$execution?.customData).toBeDefined();
		expect(typeof result.$execution?.customData?.set).toBe('function');
		expect(typeof result.$execution?.customData?.setAll).toBe('function');
		expect(typeof result.$execution?.customData?.get).toBe('function');
		expect(typeof result.$execution?.customData?.getAll).toBe('function');
	});

	it('should handle customData operations correctly', () => {
		const result = getAdditionalKeys(additionalData, 'manual', runExecutionData);
		const customData = result.$execution?.customData;

		customData?.set('testKey', 'testValue');
		expect(customData?.get('testKey')).toBe('testValue');

		customData?.setAll({ key1: 'value1', key2: 'value2' });
		const allData = customData?.getAll();
		expect(allData).toEqual({
			testKey: 'testValue',
			key1: 'value1',
			key2: 'value2',
		});
	});

	it('should include secrets when enabled', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null, { secretsEnabled: true });

		expect(result.$secrets).toBeDefined();
		expect((result.$secrets?.provider1 as IDataObject).secret1).toEqual('secret-value');
	});

	it('should not include secrets when disabled', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null, { secretsEnabled: false });

		expect(result.$secrets).toBeUndefined();
	});

	it('should throw errors in manual mode', () => {
		const result = getAdditionalKeys(additionalData, 'manual', runExecutionData);

		expect(() => {
			result.$execution?.customData?.set('invalid*key', 'value');
		}).toThrow();
	});

	it('should correctly set resume URLs', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null);

		expect(result.$execution?.resumeUrl).toBe('https://webhook.test/123');
		expect(result.$execution?.resumeFormUrl).toBe('https://form.test/123');
		expect(result.$resumeWebhookUrl).toBe('https://webhook.test/123'); // Test deprecated property
	});

	it('should return test mode when manual', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null);

		expect(result.$execution?.mode).toBe('test');
	});

	it('should return variables from additionalData', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null);
		expect(result.$vars?.testVar).toEqual('value');
	});

	it('should handle errors in non-manual mode without throwing', () => {
		const result = getAdditionalKeys(additionalData, 'internal', runExecutionData);
		const customData = result.$execution?.customData;

		expect(() => {
			customData?.set('invalid*key', 'value');
		}).not.toThrow();
	});

	it('should return undefined customData when runExecutionData is null', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null);

		expect(result.$execution?.customData).toBeUndefined();
	});

	it('should respect metadata KV limit', () => {
		const result = getAdditionalKeys(additionalData, 'manual', runExecutionData);
		const customData = result.$execution?.customData;

		// Add 11 key-value pairs (exceeding the limit of 10)
		for (let i = 0; i < 11; i++) {
			customData?.set(`key${i}`, `value${i}`);
		}

		const allData = customData?.getAll() ?? {};
		expect(Object.keys(allData)).toHaveLength(10);
	});
});
