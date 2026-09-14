import type { IHttpRequestMethods, IHttpRequestOptions, IDataObject } from 'n8n-workflow';
import { createHash, createHmac } from 'node:crypto';

import type { AwsIamCredentialsType, AwsSecurityHeaders } from './types';
import { awsGetSignInOptionsAndUpdateRequest, signOptions } from './utils';

// End-to-end SigV4 tests with the REAL signers (no aws4 mock): a hand-computed
// golden vector proves the signed canonical path is S3's strict UriEncode form,
// and legacy/new parity runs prove the smithy path signs identically to aws4 —
// the decade-proven oracle for S3's server-side canonicalization.

const credentials: AwsIamCredentialsType = {
	region: 'us-east-1',
	customEndpoints: false,
	accessKeyId: 'AKIDEXAMPLE',
	secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
	temporaryCredentials: false,
};

const securityHeaders: AwsSecurityHeaders = {
	accessKeyId: credentials.accessKeyId,
	secretAccessKey: credentials.secretAccessKey,
	sessionToken: undefined,
};

const FIXED_TIME = new Date('2026-07-22T08:00:00Z');
const AMZ_DATE = '20260722T080000Z';
const DATE_STAMP = '20260722';

const sha256Hex = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) =>
	createHmac('sha256', key).update(data).digest();

function expectedSignature(canonicalRequest: string, region: string, service: string): string {
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		AMZ_DATE,
		`${DATE_STAMP}/${region}/${service}/aws4_request`,
		sha256Hex(canonicalRequest),
	].join('\n');
	const kDate = hmac(`AWS4${credentials.secretAccessKey}`, DATE_STAMP);
	const kRegion = hmac(kDate, region);
	const kService = hmac(kRegion, service);
	const kSigning = hmac(kService, 'aws4_request');
	return createHmac('sha256', kSigning).update(stringToSign).digest('hex');
}

function getHeader(result: IHttpRequestOptions, name: string): string {
	const headers = (result.headers ?? {}) as Record<string, string>;
	const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
	if (!key) throw new Error(`missing expected header: ${name}`);
	return headers[key];
}

function parseAuthorization(auth: string): { signature: string; signedHeaders: string } {
	const signature = /Signature=([0-9a-f]{64})/.exec(auth)?.[1];
	const signedHeaders = /SignedHeaders=([^,\s]+)/.exec(auth)?.[1];
	if (!signature || !signedHeaders) throw new Error(`unparseable Authorization header: ${auth}`);
	return { signature, signedHeaders };
}

async function signS3Request(options: {
	legacy: boolean;
	path: string;
	method: IHttpRequestMethods;
	body?: string | Buffer;
	query?: IDataObject;
}): Promise<{ result: IHttpRequestOptions; url: string }> {
	// The flag must be set before the path is built: the legacy branch skips the
	// strict encoding so the rollback lever reproduces pre-migration wire bytes.
	if (options.legacy) {
		process.env.N8N_AWS_LEGACY_SIGNER = 'true';
	} else {
		delete process.env.N8N_AWS_LEGACY_SIGNER;
	}
	const requestOptions = {
		headers: {},
		...(options.body !== undefined && { body: options.body }),
		...(options.query && { qs: { query: options.query } }),
	} as IHttpRequestOptions;
	const { signOpts, url } = awsGetSignInOptionsAndUpdateRequest(
		requestOptions,
		credentials,
		options.path,
		options.method,
		's3',
		'us-east-1',
	);
	const result = await signOptions(requestOptions, signOpts, securityHeaders, url, options.method);
	return { result, url };
}

describe('S3 path signing (real signers)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(FIXED_TIME);
	});

	afterEach(() => {
		vi.useRealTimers();
		delete process.env.N8N_AWS_LEGACY_SIGNER;
	});

	it('signs the strictly UriEncoded object path — hand-computed golden vector', async () => {
		const { result, url } = await signS3Request({
			legacy: false,
			path: '/bucket/report (1)+final.pdf',
			method: 'GET',
		});

		const canonicalPath = '/bucket/report%20%281%29%2Bfinal.pdf';
		expect(url).toBe(`https://s3.us-east-1.amazonaws.com${canonicalPath}`);

		const emptyBodyHash = sha256Hex('');
		const canonicalRequest = [
			'GET',
			canonicalPath,
			'',
			'host:s3.us-east-1.amazonaws.com',
			`x-amz-content-sha256:${emptyBodyHash}`,
			`x-amz-date:${AMZ_DATE}`,
			'',
			'host;x-amz-content-sha256;x-amz-date',
			emptyBodyHash,
		].join('\n');

		const auth = getHeader(result, 'authorization');
		expect(auth).toContain(`Signature=${expectedSignature(canonicalRequest, 'us-east-1', 's3')}`);
		expect(auth).toContain(
			`Credential=${credentials.accessKeyId}/${DATE_STAMP}/us-east-1/s3/aws4_request`,
		);
	});

	// Keys covering every character class the fix changes, plus already-working ones.
	const KEY_CORPUS = [
		'/bucket/plain.txt',
		'/bucket/my report.pdf',
		'/bucket/report (1)&v=2!.pdf',
		"/bucket/quart'ile*star.log",
		'/bucket/at@10:30,x;y=[z]|w.bin',
		'/bucket/café 中文.pdf',
		'/bucket/nested/deep (copy)/key.json',
		'/bucket/a%2Fb.txt',
	];

	describe.each(KEY_CORPUS)('key %s', (path) => {
		it('new signer matches the legacy aws4 signature (GET)', async () => {
			const legacy = await signS3Request({ legacy: true, path, method: 'GET' });
			const smithy = await signS3Request({ legacy: false, path, method: 'GET' });

			const legacyAuth = parseAuthorization(getHeader(legacy.result, 'authorization'));
			const smithyAuth = parseAuthorization(getHeader(smithy.result, 'authorization'));

			// Same header set means the signatures are computed over comparable
			// canonical requests — any difference is the path.
			expect(smithyAuth.signedHeaders).toBe(legacyAuth.signedHeaders);
			expect(smithyAuth.signature).toBe(legacyAuth.signature);
		});

		it('new signer matches the legacy aws4 signature (PUT with body)', async () => {
			const body = Buffer.from('object body bytes');
			const legacy = await signS3Request({ legacy: true, path, method: 'PUT', body });
			const smithy = await signS3Request({ legacy: false, path, method: 'PUT', body });

			const legacyAuth = parseAuthorization(getHeader(legacy.result, 'authorization'));
			const smithyAuth = parseAuthorization(getHeader(smithy.result, 'authorization'));

			expect(smithyAuth.signedHeaders).toBe(legacyAuth.signedHeaders);
			expect(smithyAuth.signature).toBe(legacyAuth.signature);
		});
	});

	it('signs multipart request shapes identically to aws4 (query canonicalization)', async () => {
		const shapes: Array<{ method: IHttpRequestMethods; query: IDataObject; body?: Buffer }> = [
			{ method: 'POST', query: { uploads: '' } },
			{
				method: 'PUT',
				query: { partNumber: '2', uploadId: 'abc+def/ghi==' },
				body: Buffer.from('chunk'),
			},
		];
		for (const shape of shapes) {
			const path = '/bucket/key (1).pdf';
			const legacy = await signS3Request({ legacy: true, path, ...shape });
			const smithy = await signS3Request({ legacy: false, path, ...shape });

			const legacyAuth = parseAuthorization(getHeader(legacy.result, 'authorization'));
			const smithyAuth = parseAuthorization(getHeader(smithy.result, 'authorization'));

			expect(smithyAuth.signedHeaders).toBe(legacyAuth.signedHeaders);
			expect(smithyAuth.signature).toBe(legacyAuth.signature);
			expect(smithy.url).toBe(
				'https://s3.us-east-1.amazonaws.com/bucket/key%20%281%29.pdf?' +
					new URLSearchParams(shape.query as Record<string, string>).toString(),
			);
		}
	});

	it('keeps pre-migration wire bytes when the legacy signer flag is set (rollback lever)', async () => {
		const { url } = await signS3Request({
			legacy: true,
			path: '/bucket/report (1)+final.pdf',
			method: 'GET',
		});
		// Raw WHATWG form: parens and + untouched, only the space encoded — byte-identical
		// to what pre-2.30 aws4 deployments sent, so + keys keep addressing 'a b'-style keys.
		expect(url).toBe('https://s3.us-east-1.amazonaws.com/bucket/report%20(1)+final.pdf');
	});

	it('deliberately diverges from aws4 for a literal + in the key (kept as %2B, not space)', async () => {
		const { url } = await signS3Request({ legacy: false, path: '/bucket/a+b.pdf', method: 'GET' });
		// aws4 signed this as /bucket/a%20b.pdf (plus-as-space), silently storing
		// 'a b.pdf'. The SDK-correct form preserves the plus; S3 decodes %2B → '+'.
		expect(url).toBe('https://s3.us-east-1.amazonaws.com/bucket/a%2Bb.pdf');
	});
});
