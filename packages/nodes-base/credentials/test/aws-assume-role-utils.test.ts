import { assumeRole } from '@credentials/common/aws/utils';
import type { AwsAssumeRoleCredentialsType } from '@credentials/common/aws/types';

function baseCredentials(
	overrides: Partial<AwsAssumeRoleCredentialsType> = {},
): AwsAssumeRoleCredentialsType {
	return {
		region: 'us-east-1',
		customEndpoints: false,
		roleArn: 'arn:aws:iam::123456789012:role/TestRole',
		externalId: 'external-id-value',
		roleSessionName: 'n8n-session',
		stsAccessKeyId: 'AKIA_TEST',
		stsSecretAccessKey: 'secret-value',
		useSystemCredentialsForRole: false,
		...overrides,
	};
}

describe('assumeRole() — centralized validation', () => {
	it('throws when roleArn is missing', async () => {
		await expect(assumeRole(baseCredentials({ roleArn: '' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when roleArn is whitespace-only', async () => {
		await expect(assumeRole(baseCredentials({ roleArn: '   ' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when externalId is missing', async () => {
		await expect(assumeRole(baseCredentials({ externalId: '' }), 'us-east-1')).rejects.toThrow(
			'External ID is required when assuming a role.',
		);
	});

	it('throws when roleSessionName is missing', async () => {
		await expect(assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1')).rejects.toThrow(
			'Role Session Name is required when assuming a role.',
		);
	});
});
