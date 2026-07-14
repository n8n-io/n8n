import type { IHttpRequestOptions } from 'n8n-workflow';

import { Aws } from '../Aws.credentials';
import type { AwsIamCredentialsType } from '../common/aws/types';
import { buildSmithyHttpRequest, splitHostPort, splitPathAndQuery } from '../common/aws/utils';

type SignOpts = Parameters<typeof buildSmithyHttpRequest>[0];

// Pure, deterministic helpers. No signer, no credential wiring.
describe('AWS signing helpers (unit)', () => {
	describe('splitPathAndQuery', () => {
		it('returns an empty query when there is no search string', () => {
			expect(splitPathAndQuery('/bucket/key')).toEqual({ path: '/bucket/key', query: {} });
		});

		it('does not itself normalize or decode the path it is given', () => {
			// This function only splits; it never runs the path through URL parsing.
			// Note the caller (awsGetSignInOptionsAndUpdateRequest) already normalized
			// the path via `new URL(...).pathname` before this ever sees it, so this
			// pins the function's own contract, not the shape a real request takes.
			expect(splitPathAndQuery('/bucket/a%2Bb/../key').path).toBe('/bucket/a%2Bb/../key');
		});

		it('keeps repeated query keys as an array', () => {
			expect(splitPathAndQuery('/?id=1&id=2&name=x')).toEqual({
				path: '/',
				query: { id: ['1', '2'], name: 'x' },
			});
		});
	});

	describe('splitHostPort', () => {
		it('splits a plain host:port', () => {
			expect(splitHostPort('localhost:4566')).toEqual({ hostname: 'localhost', port: 4566 });
		});

		it('returns an undefined port when there is none', () => {
			expect(splitHostPort('sqs.eu-central-1.amazonaws.com')).toEqual({
				hostname: 'sqs.eu-central-1.amazonaws.com',
				port: undefined,
			});
		});

		it('keeps a bracketed IPv6 literal intact and reads the port after it', () => {
			// A naive `.split(':')` cuts an IPv6 address at its first colon; this must
			// treat everything inside the brackets as the hostname.
			expect(splitHostPort('[::1]:4566')).toEqual({ hostname: '[::1]', port: 4566 });
		});

		it('handles a bracketed IPv6 literal with no port', () => {
			expect(splitHostPort('[::1]')).toEqual({ hostname: '[::1]', port: undefined });
		});
	});

	describe('buildSmithyHttpRequest', () => {
		const base = { host: 'sqs.eu-central-1.amazonaws.com', path: '/', method: 'POST' };

		it('lowercases header keys and drops the incoming host header', () => {
			const req = buildSmithyHttpRequest({
				...base,
				headers: { 'X-Custom-Header': 'v', Host: 'ignored' },
			} as SignOpts);

			expect(req.headers['x-custom-header']).toBe('v');
			expect(req.headers['X-Custom-Header']).toBeUndefined();
			// host comes from signOpts.host, not the incoming Host header
			expect(req.headers.host).toBe('sqs.eu-central-1.amazonaws.com');
		});

		it('injects aws4-style content-type and content-length for a string body', () => {
			const req = buildSmithyHttpRequest({ ...base, headers: {}, body: 'a=1&b=2' } as SignOpts);

			expect(req.headers['content-type']).toBe('application/x-www-form-urlencoded; charset=utf-8');
			expect(req.headers['content-length']).toBe(String(Buffer.byteLength('a=1&b=2')));
		});

		it('injects aws4-style content-type and content-length for a Buffer body', () => {
			const buf = Buffer.from('binary-payload');
			const req = buildSmithyHttpRequest({ ...base, headers: {}, body: buf } as SignOpts);

			expect(req.headers['content-type']).toBe('application/x-www-form-urlencoded; charset=utf-8');
			expect(req.headers['content-length']).toBe(String(Buffer.byteLength(buf)));
		});

		it('does not override an existing content-type', () => {
			const req = buildSmithyHttpRequest({
				...base,
				headers: { 'content-type': 'application/json' },
				body: '{"a":1}',
			} as SignOpts);

			expect(req.headers['content-type']).toBe('application/json');
		});

		it('parses host:port into hostname and numeric port', () => {
			const req = buildSmithyHttpRequest({
				...base,
				host: 'localhost:4566',
				headers: {},
			} as SignOpts);

			expect(req.hostname).toBe('localhost');
			expect(req.port).toBe(4566);
		});

		it('splits the query out of the path', () => {
			const req = buildSmithyHttpRequest({
				...base,
				path: '/?Action=ListQueues&Version=2012-11-05',
				headers: {},
			} as SignOpts);

			expect(req.path).toBe('/');
			expect(req.query).toEqual({ Action: 'ListQueues', Version: '2012-11-05' });
		});
	});
});

// End to end through the credential, with the REAL @smithy/signature-v4 signer,
// so assertions reflect what AWS actually receives.
describe('AWS signing (integration, real signer)', () => {
	const aws = new Aws();

	const credentials: AwsIamCredentialsType = {
		region: 'eu-central-1',
		accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		customEndpoints: false,
		temporaryCredentials: false,
	};

	const baseRequest: IHttpRequestOptions = {
		qs: {},
		body: {},
		headers: {},
		url: '',
		baseURL: '',
		method: 'GET',
	};

	function signedHeadersFrom(authorization: string): string[] {
		const match = /SignedHeaders=([^,]+)/.exec(authorization);
		return match ? match[1].split(';') : [];
	}

	it('includes x-amz-content-sha256 for S3 requests (required by S3)', async () => {
		const result = await aws.authenticate(credentials, {
			...baseRequest,
			qs: { service: 's3', path: '/my-bucket/my-key.txt' },
		});

		const headers = result.headers as Record<string, string>;
		const authorization = headers.authorization ?? headers.Authorization;

		// S3 rejects SigV4 requests that omit this header, and aws4 always set it
		// for S3. The header must be present and part of the signed headers list.
		expect(headers['x-amz-content-sha256']).toBeDefined();
		expect(signedHeadersFrom(authorization)).toContain('x-amz-content-sha256');
	});

	it('omits x-amz-content-sha256 for non-S3 services (matches aws4)', async () => {
		const result = await aws.authenticate(credentials, {
			...baseRequest,
			qs: { service: 'sqs' },
		});

		const headers = result.headers as Record<string, string>;
		const authorization = headers.authorization ?? headers.Authorization;

		expect(headers['x-amz-content-sha256']).toBeUndefined();
		expect(signedHeadersFrom(authorization)).not.toContain('x-amz-content-sha256');
	});

	it('signs the STS GetCallerIdentity credential-test shape', async () => {
		// This is the exact request shape `awsCredentialsTest` sends when a user
		// clicks "Test credential": POST, no path, Action/Version in the query
		// string, empty body. A signing failure here breaks that button for every
		// AWS credential, silently, with no obvious link back to this code path.
		const result = await aws.authenticate(credentials, {
			...baseRequest,
			baseURL: 'https://sts.eu-central-1.amazonaws.com',
			url: '?Action=GetCallerIdentity&Version=2011-06-15',
			method: 'POST',
		});

		const headers = result.headers as Record<string, string>;
		const authorization = headers.authorization ?? headers.Authorization;

		expect(authorization).toBeDefined();
		expect(authorization).toContain('AWS4-HMAC-SHA256');
		expect(authorization).toContain('/sts/aws4_request');
		expect(result.url).toBe(
			'https://sts.eu-central-1.amazonaws.com/?Action=GetCallerIdentity&Version=2011-06-15',
		);
	});

	it('signs an S3 PUT with a Buffer body (matches the S3 node upload path)', async () => {
		const buf = Buffer.from('binary content');
		const result = await aws.authenticate(credentials, {
			...baseRequest,
			method: 'PUT',
			body: buf,
			qs: { service: 's3', path: '/my-bucket/binary.json' },
		});

		const headers = result.headers as Record<string, string>;
		const authorization = headers.authorization ?? headers.Authorization;

		expect(headers['x-amz-content-sha256']).toBeDefined();
		expect(signedHeadersFrom(authorization)).toContain('x-amz-content-sha256');
		expect(result.body).toBe(buf);
	});

	describe('legacy fallback', () => {
		afterEach(() => {
			delete process.env.N8N_AWS_LEGACY_SIGNER;
		});

		it('signs via aws4 when N8N_AWS_LEGACY_SIGNER=true', async () => {
			process.env.N8N_AWS_LEGACY_SIGNER = 'true';

			const result = await aws.authenticate(credentials, {
				...baseRequest,
				qs: { service: 'sqs' },
			});

			const headers = result.headers as Record<string, string>;
			// aws4 writes capitalized header keys; the smithy path lowercases them.
			// The capitalized keys prove the legacy path produced this signature.
			expect(headers.Authorization).toBeDefined();
			expect(headers.Authorization).toContain('AWS4-HMAC-SHA256');
			expect(headers.authorization).toBeUndefined();
		});

		it('signs a vpce Bedrock request with the bedrock service namespace via aws4', async () => {
			process.env.N8N_AWS_LEGACY_SIGNER = 'true';

			const result = await aws.authenticate(credentials, {
				...baseRequest,
				url: 'https://vpce-0abc123.bedrock-runtime.us-east-1.vpce.amazonaws.com/model/anthropic.claude-v2/invoke',
			});

			const headers = result.headers as Record<string, string>;
			expect(headers.Authorization).toContain('/us-east-1/bedrock/aws4_request');
		});
	});
});
