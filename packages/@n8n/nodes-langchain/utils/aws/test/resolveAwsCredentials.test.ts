import { mock } from 'jest-mock-extended';
import type { ISupplyDataFunctions, INode } from 'n8n-workflow';

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
