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
		hmacSignatureSecret: undefined,
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

	it('should set plain resume URLs when hmacSignatureSecret is not provided', () => {
		const result = getAdditionalKeys(additionalData, 'manual', null);

		expect(result.$execution?.resumeUrl).toBe('https://webhook.test/123');
		expect(result.$execution?.resumeFormUrl).toBe('https://form.test/123');
		expect(result.$resumeWebhookUrl).toBe('https://webhook.test/123'); // Test deprecated property
	});

	it('should add HMAC signature to resume URLs when additionalData has hmacSignatureSecret', () => {
		const additionalDataWithSecret = mock<IWorkflowExecuteAdditionalData>({
			executionId: '123',
			webhookWaitingBaseUrl: 'https://webhook.test',
			formWaitingBaseUrl: 'https://form.test',
			variables: { testVar: 'value' },
			externalSecretsProxy,
			hmacSignatureSecret: 'test-secret-key',
		});

		const result = getAdditionalKeys(additionalDataWithSecret, 'manual', null);

		// URLs should contain signature parameter with HMAC signature (64-character hex string)
		const resumeUrl = new URL(result.$execution?.resumeUrl ?? '');
		const resumeFormUrl = new URL(result.$execution?.resumeFormUrl ?? '');
		const deprecatedUrl = new URL(result.$resumeWebhookUrl ?? '');

		// Check that signature parameter exists and is a valid 64-char hex string
		expect(resumeUrl.searchParams.get('signature')).toMatch(/^[a-f0-9]{64}$/);
		expect(resumeFormUrl.searchParams.get('signature')).toMatch(/^[a-f0-9]{64}$/);
		expect(deprecatedUrl.searchParams.get('signature')).toMatch(/^[a-f0-9]{64}$/);
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

	it('should handle invalid URLs gracefully and return original URL when signing fails', () => {
		const additionalDataWithInvalidUrl = mock<IWorkflowExecuteAdditionalData>({
			executionId: '123',
			webhookWaitingBaseUrl: 'not-a-valid-url',
			formWaitingBaseUrl: 'also-invalid',
			variables: {},
			externalSecretsProxy,
			hmacSignatureSecret: 'test-secret',
		});

		// Should not throw - should return original URLs without signature
		const result = getAdditionalKeys(additionalDataWithInvalidUrl, 'manual', null);
		expect(result.$execution?.resumeUrl).toBe('not-a-valid-url/123');
		expect(result.$execution?.resumeFormUrl).toBe('also-invalid/123');
	});
});
