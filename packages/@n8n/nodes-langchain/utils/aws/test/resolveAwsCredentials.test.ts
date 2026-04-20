import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INode } from 'n8n-workflow';

// Mock the SDK provider factory. Each call returns a function identity we can inspect.
jest.mock('@aws-sdk/credential-providers', () => ({
	fromTemporaryCredentials: jest.fn((args: unknown) => {
		const provider = jest.fn().mockResolvedValue({
			accessKeyId: 'ASIAPROVIDER',
			secretAccessKey: 'SECRET',
			sessionToken: 'TOKEN',
		});
		(provider as unknown as { __constructedWith: unknown }).__constructedWith = args;
		return provider;
	}),
}));

import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';

import { resolveAwsCredentials } from '../resolveAwsCredentials';

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
});

describe('resolveAwsCredentials — AssumeRole path', () => {
	beforeEach(() => {
		(fromTemporaryCredentials as jest.Mock).mockClear();
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
		const callArg = (fromTemporaryCredentials as jest.Mock).mock.calls[0][0] as {
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
