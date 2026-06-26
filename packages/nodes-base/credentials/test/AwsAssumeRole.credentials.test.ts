import { sign } from 'aws4';
import type { IHttpRequestOptions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { AwsAssumeRole } from '../AwsAssumeRole.credentials';
import type { AwsAssumeRoleCredentialsType } from '../common/aws/types';

// assumeRole sends via @n8n/backend-network/transport's asCustomFetch(), not the global fetch.
const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock('@n8n/backend-network/transport', () => ({
	createDispatcherTransport: () => ({
		asCustomFetch: () => mockFetch,
	}),
}));

vi.mock('aws4', () => ({
	sign: vi.fn(),
}));

const stsAssumeRoleResponseXml = `<?xml version="1.0"?>
<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
	<AssumeRoleResult>
		<Credentials>
			<AccessKeyId>ASSUMED-KEY</AccessKeyId>
			<SecretAccessKey>ASSUMED-SECRET</SecretAccessKey>
			<SessionToken>ASSUMED-SESSION</SessionToken>
			<Expiration>2099-01-01T00:00:00Z</Expiration>
		</Credentials>
	</AssumeRoleResult>
</AssumeRoleResponse>`;

describe('AwsAssumeRole Credential', () => {
	const aws = new AwsAssumeRole();
	let mockSign: Mock;

	const credentials: AwsAssumeRoleCredentialsType = {
		region: 'us-east-1',
		customEndpoints: false,
		roleArn: 'arn:aws:iam::123456789012:role/MyRole',
		externalId: 'ext-id',
		roleSessionName: 'n8n-session',
		stsAccessKeyId: 'sts-key',
		stsSecretAccessKey: 'sts-secret',
		useSystemCredentialsForRole: false,
	};

	beforeEach(() => {
		mockSign = sign as unknown as Mock;
		mockFetch.mockReset();
		mockFetch.mockResolvedValue(new Response(stsAssumeRoleResponseXml, { status: 200 }));
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should sign Bedrock requests with the bedrock service namespace', async () => {
		const requestOptions: IHttpRequestOptions = {
			qs: {},
			body: {},
			headers: {},
			baseURL: '',
			url: 'https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke',
			method: 'POST',
		};

		await aws.authenticate(credentials, requestOptions);

		const finalCall = mockSign.mock.calls.at(-1);
		expect(finalCall?.[0]).toEqual(
			expect.objectContaining({
				host: 'bedrock-runtime.us-east-1.amazonaws.com',
				region: 'us-east-1',
				service: 'bedrock',
			}),
		);
	});
});
