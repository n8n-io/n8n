import { assumeRole } from '@credentials/common/aws/utils';
import type { AwsAssumeRoleCredentialsType } from '@credentials/common/aws/types';
import { UserError } from 'n8n-workflow';

// `assumeRole` sends via @n8n/backend-network/transport's asCustomFetch(), not the
// global fetch. Proxy/NO_PROXY resolution is delegated to the transport (`proxy: 'env'`),
// so we mock the transport and assert on the delegation rather than on a dispatcher.
const { mockFetch, createDispatcherTransportMock } = vi.hoisted(() => {
	const mockFetch = vi.fn();
	return {
		mockFetch,
		createDispatcherTransportMock: vi.fn(() => ({ asCustomFetch: () => mockFetch })),
	};
});

vi.mock('@n8n/backend-network/transport', () => ({
	createDispatcherTransport: createDispatcherTransportMock,
}));

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
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleArn: '' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when roleArn is whitespace-only', async () => {
		await expect(assumeRole(baseCredentials({ roleArn: '   ' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleArn: '   ' }), 'us-east-1')).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when externalId is missing', async () => {
		await expect(assumeRole(baseCredentials({ externalId: '' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ externalId: '' }), 'us-east-1')).rejects.toThrow(
			'External ID is required when assuming a role.',
		);
	});

	it('throws when roleSessionName is missing', async () => {
		await expect(assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1')).rejects.toThrow(
			UserError,
		);
		await expect(assumeRole(baseCredentials({ roleSessionName: '' }), 'us-east-1')).rejects.toThrow(
			'Role Session Name is required when assuming a role.',
		);
	});
});

describe('assumeRole() — proxy-aware transport', () => {
	beforeEach(() => {
		createDispatcherTransportMock.mockClear();
		mockFetch.mockReset();
		// Return a minimal STS-success XML so assumeRole() completes.
		mockFetch.mockResolvedValue({
			ok: true,
			text: async () =>
				'<AssumeRoleResponse><AssumeRoleResult><Credentials>' +
				'<AccessKeyId>ASIATEST</AccessKeyId>' +
				'<SecretAccessKey>SECRET</SecretAccessKey>' +
				'<SessionToken>TOKEN</SessionToken>' +
				'</Credentials></AssumeRoleResult></AssumeRoleResponse>',
		});
	});

	it('routes the STS request through the centralized proxy-aware transport', async () => {
		await assumeRole(baseCredentials(), 'us-east-1');

		// Proxy/NO_PROXY resolution is delegated to the transport via `proxy: 'env'`.
		expect(createDispatcherTransportMock).toHaveBeenCalledWith({ proxy: 'env' });
		expect(mockFetch).toHaveBeenCalledTimes(1);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://sts.us-east-1.amazonaws.com',
			expect.objectContaining({
				method: 'POST',
				body: expect.stringContaining('Action=AssumeRole'),
			}),
		);
	});
});
