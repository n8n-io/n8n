import type * as AwsCredentialsModule from 'n8n-nodes-base/aws-credentials';
import { UserError, type ISupplyDataFunctions, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

// Mock the SDK provider factory. Each call returns a function identity we can inspect.
vi.mock('@aws-sdk/credential-providers', () => ({
	fromTemporaryCredentials: vi.fn((args: unknown) => {
		const provider = vi.fn().mockResolvedValue({
			accessKeyId: 'ASIAPROVIDER',
			secretAccessKey: 'SECRET',
			sessionToken: 'TOKEN',
		});
		(provider as unknown as { __constructedWith: unknown }).__constructedWith = args;
		return provider;
	}),
}));

vi.mock('n8n-nodes-base/aws-credentials', async (importOriginal) => ({
	...(await importOriginal<typeof AwsCredentialsModule>()),
	getSystemCredentials: vi.fn(),
}));

vi.mock('@n8n/ai-utilities', () => ({
	getNodeProxyAgent: vi.fn(),
}));

import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { getSystemCredentials } from 'n8n-nodes-base/aws-credentials';
import { getNodeProxyAgent } from '@n8n/ai-utilities';

import { resolveAwsCredentials } from '../resolveAwsCredentials';

const mockedFromTemporaryCredentials = vi.mocked(fromTemporaryCredentials);
const mockedGetSystemCredentials = vi.mocked(getSystemCredentials);
const mockedGetNodeProxyAgent = vi.mocked(getNodeProxyAgent);

function makeContext(opts: {
	authentication?: 'iam' | 'assumeRole';
	awsCredential?: Record<string, unknown>;
	awsAssumeRoleCredential?: Record<string, unknown>;
	credentialId?: string;
}) {
	const context = mock<ISupplyDataFunctions>();
	context.getNodeParameter.mockImplementation((name: string, _idx: number, fallback?: unknown) => {
		if (name === 'authentication') return opts.authentication ?? fallback ?? 'iam';
		throw new Error(`unexpected getNodeParameter: ${name}`);
	});
	context.getCredentials.mockImplementation(async (type: string) => {
		if (type === 'aws') return opts.awsCredential ?? {};
		if (type === 'awsAssumeRole') return opts.awsAssumeRoleCredential ?? {};
		throw new Error(`unexpected getCredentials: ${type}`);
	});
	context.getNode.mockReturnValue({
		credentials: {
			awsAssumeRole: { id: opts.credentialId ?? 'cred-id-123', name: 'Assume role' },
		},
	} as unknown as INode);
	return context;
}

describe('resolveAwsCredentials — IAM path', () => {
	it('returns static identity when authentication is iam', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'us-east-1',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: false,
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.region).toBe('us-east-1');
		expect(result.credentials).toEqual({
			accessKeyId: 'AKIATEST',
			secretAccessKey: 'SECRET',
		});
	});

	it('includes sessionToken when temporaryCredentials is true', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'us-east-1',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: true,
				sessionToken: 'SESSION',
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.credentials).toEqual({
			accessKeyId: 'AKIATEST',
			secretAccessKey: 'SECRET',
			sessionToken: 'SESSION',
		});
	});

	it('defaults to iam path when authentication parameter is missing', async () => {
		const context = makeContext({
			authentication: undefined,
			awsCredential: {
				region: 'eu-central-1',
				accessKeyId: 'AKIA2',
				secretAccessKey: 'SECRET2',
				temporaryCredentials: false,
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.region).toBe('eu-central-1');
		expect(result.credentials).toEqual({
			accessKeyId: 'AKIA2',
			secretAccessKey: 'SECRET2',
		});
	});

	it('reads authentication from the supplied item index', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'us-east-1',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: false,
			},
		});
		await resolveAwsCredentials(context, 3);
		expect(context.getNodeParameter).toHaveBeenCalledWith('authentication', 3, 'iam');
	});

	it('throws when region is not a supported AWS region', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'not-a-region',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: false,
			},
		});
		await expect(resolveAwsCredentials(context)).rejects.toThrow(UserError);
		await expect(resolveAwsCredentials(context)).rejects.toThrow('Unsupported AWS region');
	});

	it('accepts the China partition region', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'cn-north-1',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: false,
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.region).toBe('cn-north-1');
	});

	it('accepts the GovCloud partition region', async () => {
		const context = makeContext({
			authentication: 'iam',
			awsCredential: {
				region: 'us-gov-west-1',
				accessKeyId: 'AKIATEST',
				secretAccessKey: 'SECRET',
				temporaryCredentials: false,
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.region).toBe('us-gov-west-1');
	});
});

describe('resolveAwsCredentials — AssumeRole path', () => {
	beforeEach(() => {
		mockedFromTemporaryCredentials.mockClear();
	});

	it('returns a provider function built from fromTemporaryCredentials', async () => {
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: {
				region: 'us-east-1',
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				stsAccessKeyId: 'AKIASTS',
				stsSecretAccessKey: 'stsSecret',
				useSystemCredentialsForRole: false,
			},
		});
		const result = await resolveAwsCredentials(context);
		expect(result.region).toBe('us-east-1');
		expect(typeof result.credentials).toBe('function');
		expect(fromTemporaryCredentials).toHaveBeenCalledTimes(1);
		const callArg = mockedFromTemporaryCredentials.mock.calls[0][0] as {
			params: { RoleArn: string; RoleSessionName: string; ExternalId: string };
			masterCredentials: unknown;
		};
		expect(callArg.params).toEqual({
			RoleArn: 'arn:aws:iam::123456789012:role/TestRole',
			RoleSessionName: 'n8n-session',
			ExternalId: 'ext-id',
		});
		expect(callArg.masterCredentials).toEqual({
			accessKeyId: 'AKIASTS',
			secretAccessKey: 'stsSecret',
		});
	});
});

describe('resolveAwsCredentials — AssumeRole validation', () => {
	const baseAssumeRoleCreds = {
		region: 'us-east-1',
		roleArn: 'arn:aws:iam::123456789012:role/TestRole',
		externalId: 'ext-id',
		roleSessionName: 'n8n-session',
		stsAccessKeyId: 'AKIASTS',
		stsSecretAccessKey: 'stsSecret',
		useSystemCredentialsForRole: false,
	};

	it('throws when roleArn is missing', async () => {
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: { ...baseAssumeRoleCreds, roleArn: '' },
		});
		await expect(resolveAwsCredentials(context)).rejects.toThrow(UserError);
		await expect(resolveAwsCredentials(context)).rejects.toThrow(
			'Role ARN is required when assuming a role.',
		);
	});

	it('throws when externalId is missing', async () => {
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: { ...baseAssumeRoleCreds, externalId: '' },
		});
		await expect(resolveAwsCredentials(context)).rejects.toThrow(UserError);
		await expect(resolveAwsCredentials(context)).rejects.toThrow(
			'External ID is required when assuming a role.',
		);
	});

	it('throws when roleSessionName is missing', async () => {
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: { ...baseAssumeRoleCreds, roleSessionName: '' },
		});
		await expect(resolveAwsCredentials(context)).rejects.toThrow(UserError);
		await expect(resolveAwsCredentials(context)).rejects.toThrow(
			'Role Session Name is required when assuming a role.',
		);
	});

	it('throws when region is not a supported AWS region', async () => {
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: { ...baseAssumeRoleCreds, region: 'not-a-region' },
		});
		await expect(resolveAwsCredentials(context)).rejects.toThrow(UserError);
		await expect(resolveAwsCredentials(context)).rejects.toThrow('Unsupported AWS region');
	});
});

describe('resolveAwsCredentials — useSystemCredentialsForRole', () => {
	beforeEach(() => {
		mockedGetSystemCredentials.mockReset();
		mockedFromTemporaryCredentials.mockClear();
	});

	it('passes a function (refreshable provider) as masterCredentials, not a snapshot', async () => {
		mockedGetSystemCredentials.mockResolvedValue({
			accessKeyId: 'AKIASYS',
			secretAccessKey: 'sysSecret',
			sessionToken: 'sysToken',
			source: 'environment',
		});
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: {
				region: 'us-east-1',
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				useSystemCredentialsForRole: true,
			},
		});
		await resolveAwsCredentials(context);

		const callArg = mockedFromTemporaryCredentials.mock.calls[0][0] as {
			masterCredentials: unknown;
		};
		expect(typeof callArg.masterCredentials).toBe('function');

		// Simulate SDK invoking the provider twice; each call should re-read system credentials.
		const masterProvider = callArg.masterCredentials as () => Promise<unknown>;
		await masterProvider();
		await masterProvider();
		expect(getSystemCredentials).toHaveBeenCalledTimes(2);
	});
});

describe('resolveAwsCredentials — proxy target URL', () => {
	beforeEach(() => {
		mockedGetNodeProxyAgent.mockReset();
		mockedFromTemporaryCredentials.mockClear();
	});

	it('calls getNodeProxyAgent with the concrete STS endpoint URL', async () => {
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: {
				region: 'eu-west-2',
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				stsAccessKeyId: 'AKIASTS',
				stsSecretAccessKey: 'stsSecret',
				useSystemCredentialsForRole: false,
			},
		});
		await resolveAwsCredentials(context);
		expect(getNodeProxyAgent).toHaveBeenCalledWith('https://sts.eu-west-2.amazonaws.com');
	});

	it('uses the China STS endpoint host for cn- regions', async () => {
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: {
				region: 'cn-north-1',
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				stsAccessKeyId: 'AKIASTS',
				stsSecretAccessKey: 'stsSecret',
				useSystemCredentialsForRole: false,
			},
		});
		await resolveAwsCredentials(context);
		expect(getNodeProxyAgent).toHaveBeenCalledWith('https://sts.cn-north-1.amazonaws.com.cn');
	});

	it('builds a NodeHttpHandler only when getNodeProxyAgent returns a proxy', async () => {
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		const context = makeContext({
			authentication: 'assumeRole',
			awsAssumeRoleCredential: {
				region: 'us-east-1',
				roleArn: 'arn:aws:iam::123456789012:role/TestRole',
				externalId: 'ext-id',
				roleSessionName: 'n8n-session',
				stsAccessKeyId: 'AKIASTS',
				stsSecretAccessKey: 'stsSecret',
				useSystemCredentialsForRole: false,
			},
		});
		await resolveAwsCredentials(context);
		const callArg = mockedFromTemporaryCredentials.mock.calls[0][0] as {
			clientConfig: { requestHandler?: unknown };
		};
		expect(callArg.clientConfig.requestHandler).toBeUndefined();
	});
});
