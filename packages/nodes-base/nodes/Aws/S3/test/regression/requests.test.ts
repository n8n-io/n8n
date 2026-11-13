import isEqual from 'lodash/isEqual';
import { mockDeep } from 'vitest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	INode,
	INodeType,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { Aws } from '../../../../../credentials/Aws.credentials';
import { AwsS3V1 } from '../../V1/AwsS3V1.node';
import { AwsS3V2 } from '../../V2/AwsS3V2.node';
import { AwsS3V1 as LegacyAwsS3V1 } from './legacy/AwsS3V1';
import { AwsS3V2 as LegacyAwsS3V2 } from './legacy/AwsS3V2';

type Captured = { method?: string; url?: string; headers?: IDataObject } | { error: string };

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'AWS S3',
	name: 'awsS3',
	group: ['output'],
	description: 'Sends data to AWS S3',
};

const keys = {
	aws: {
		accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
		secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
		temporaryCredentials: false,
		customEndpoints: false,
	},
};

const credentialConfigs: Record<string, ICredentialDataDecryptedObject> = {
	'default endpoint in eu-central-1': { ...keys.aws, region: 'eu-central-1' },
	'default endpoint in us-east-1': { ...keys.aws, region: 'us-east-1' },
	'default endpoint in cn-north-1': { ...keys.aws, region: 'cn-north-1' },
	'custom S3 endpoint': {
		...keys.aws,
		region: 'eu-central-1',
		customEndpoints: true,
		s3Endpoint: 'https://minio.example.com:9000',
	},
	'custom S3 endpoint with a path prefix': {
		...keys.aws,
		region: 'eu-central-1',
		customEndpoints: true,
		s3Endpoint: 'https://gateway.example.com/storage',
	},
	'temporary credentials': {
		...keys.aws,
		region: 'eu-west-1',
		temporaryCredentials: true,
		sessionToken: 'FwoGZXIvYXdzEXAMPLETOKEN',
	},
};

const bucketNames = ['orders-archive', 'logs.example.com', 'Legacy_Bucket'];

const objectKeys = [
	'report.pdf',
	'docs/2024/report.pdf',
	'my report.pdf',
	'report%20final.pdf',
	'50%20off%.txt',
	'100%.txt',
	'a+b.txt',
	'list[1]^|;.txt',
	'time:12.txt',
	'résumé-日本.txt',
	'a//b.txt',
	'/leading.txt',
	'folder/',
	'back\\slash.txt',
	'docs/../report.pdf',
];

type Operation = { name: string; keyInPath: boolean; versions: number[]; parameters: IDataObject };

function operations(bucketName: string, key: string): Operation[] {
	const all: Operation[] = [
		{
			name: 'bucket create',
			keyInPath: false,
			versions: [1, 2],
			parameters: { resource: 'bucket', operation: 'create', name: bucketName },
		},
		{
			name: 'bucket delete',
			keyInPath: false,
			versions: [1, 2],
			parameters: { resource: 'bucket', operation: 'delete', name: bucketName },
		},
		{
			name: 'bucket get many',
			keyInPath: false,
			versions: [1, 2],
			parameters: { resource: 'bucket', operation: 'getAll', returnAll: true },
		},
		{
			name: 'bucket search',
			keyInPath: false,
			versions: [1, 2],
			parameters: {
				resource: 'bucket',
				operation: 'search',
				bucketName,
				returnAll: true,
				additionalFields: { prefix: key },
			},
		},
		{
			name: 'folder create',
			keyInPath: true,
			versions: [1, 2],
			parameters: { resource: 'folder', operation: 'create', bucketName, folderName: key },
		},
		{
			name: 'folder create in parent',
			keyInPath: true,
			versions: [1, 2],
			parameters: {
				resource: 'folder',
				operation: 'create',
				bucketName,
				folderName: 'sub',
				additionalFields: { parentFolderKey: key },
			},
		},
		{
			name: 'folder delete',
			keyInPath: true,
			versions: [1, 2],
			parameters: { resource: 'folder', operation: 'delete', bucketName, folderKey: key },
		},
		{
			name: 'folder get many',
			keyInPath: false,
			versions: [1, 2],
			parameters: {
				resource: 'folder',
				operation: 'getAll',
				bucketName,
				returnAll: true,
				options: { folderKey: key },
			},
		},
		{
			name: 'file copy',
			keyInPath: true,
			versions: [1, 2],
			parameters: {
				resource: 'file',
				operation: 'copy',
				sourcePath: `/${bucketName}/source.txt`,
				destinationPath: `/${bucketName}/${key}`,
			},
		},
		{
			name: 'file download',
			keyInPath: true,
			versions: [1, 2],
			parameters: { resource: 'file', operation: 'download', bucketName, fileKey: key },
		},
		{
			name: 'file delete',
			keyInPath: true,
			versions: [1, 2],
			parameters: { resource: 'file', operation: 'delete', bucketName, fileKey: key },
		},
		{
			name: 'file get many',
			keyInPath: false,
			versions: [1, 2],
			parameters: {
				resource: 'file',
				operation: 'getAll',
				bucketName,
				returnAll: true,
				options: { folderKey: key },
			},
		},
		{
			name: 'file upload text',
			keyInPath: true,
			versions: [1, 2],
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: key,
				binaryData: false,
				fileContent: 'hello',
			},
		},
		{
			name: 'file upload text in parent',
			keyInPath: true,
			versions: [1, 2],
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: 'notes.txt',
				binaryData: false,
				fileContent: 'hello',
				additionalFields: { parentFolderKey: key },
			},
		},
		{
			name: 'file upload binary',
			keyInPath: true,
			versions: [1, 2],
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: key,
				binaryData: true,
			},
		},
		{
			name: 'file upload multipart',
			keyInPath: true,
			versions: [2],
			parameters: {
				resource: 'file',
				operation: 'upload',
				bucketName,
				fileName: key,
				binaryData: true,
				binaryId: 'filesystem-v2:upload',
			},
		},
	];
	return all;
}

const xml = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;

function respond(
	method: string,
	url: string,
	options: IHttpRequestOptions & IDataObject,
	region: string,
) {
	const { searchParams } = new URL(url);
	if (searchParams.has('location')) {
		return xml(
			`<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${region}</LocationConstraint>`,
		);
	}
	if (searchParams.has('list-type')) {
		return xml('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
	}
	if (searchParams.has('uploads')) {
		return xml(
			'<InitiateMultipartUploadResult><UploadId>upload-1</UploadId></InitiateMultipartUploadResult>',
		);
	}
	if (searchParams.has('max-parts')) {
		return xml(
			'<ListPartsResult><Part><ETag>"part-1"</ETag><PartNumber>1</PartNumber></Part></ListPartsResult>',
		);
	}
	if (searchParams.has('uploadId') && method === 'POST') {
		return xml('<CompleteMultipartUploadResult><Key>key</Key></CompleteMultipartUploadResult>');
	}
	if (options.resolveWithFullResponse) {
		return { body: 'hello', headers: { 'content-type': 'text/plain' } };
	}
	if (method === 'PUT' && (options.headers as IDataObject | undefined)?.['x-amz-copy-source']) {
		return xml('<CopyObjectResult><ETag>"copy"</ETag></CopyObjectResult>');
	}
	if (method === 'GET') {
		return xml('<ListAllMyBucketsResult><Buckets></Buckets></ListAllMyBucketsResult>');
	}
	return '';
}

async function capture(
	node: INodeType,
	version: number,
	parameters: IDataObject,
	credentials: ICredentialDataDecryptedObject,
): Promise<Captured[]> {
	const requests: Captured[] = [];
	const context = mockDeep<IExecuteFunctions>();
	const values: IDataObject = {
		authentication: 'iam',
		additionalFields: {},
		options: {},
		tagsUi: {},
		binaryPropertyName: 'data',
		returnAll: false,
		limit: 5,
		...parameters,
	};
	context.getNodeParameter.mockImplementation(
		(name: string, _itemIndex: number, fallback?: unknown) =>
			(name in values ? values[name] : fallback) as never,
	);
	context.getCredentials.mockResolvedValue(credentials);
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNode.mockReturnValue({ name: 'AWS S3', typeVersion: version } as INode);
	context.continueOnFail.mockReturnValue(false);
	context.helpers.returnJsonArray.mockImplementation((data) =>
		(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
	);
	context.helpers.constructExecutionMetaData.mockImplementation((data) => data as never);
	context.helpers.prepareBinaryData.mockResolvedValue({ data: '', mimeType: 'text/plain' });
	context.helpers.assertBinaryData.mockReturnValue({
		data: '',
		mimeType: 'text/plain',
		fileName: 'local.txt',
		id: parameters.binaryId as string | undefined,
	});
	context.helpers.getBinaryDataBuffer.mockResolvedValue(Buffer.from('hello'));
	context.helpers.getBinaryStream.mockResolvedValue([Buffer.from('hello')] as never);
	context.helpers.binaryToBuffer.mockResolvedValue(Buffer.from('hello'));
	context.helpers.requestWithAuthentication.mockImplementation(async (_type, options) => {
		const signed = await new Aws().authenticate(credentials, {
			...options,
			qs: { ...options.qs },
		} as IHttpRequestOptions);
		requests.push({ method: signed.method, url: signed.url, headers: signed.headers });
		return respond(
			signed.method ?? 'GET',
			signed.url,
			options as IHttpRequestOptions & IDataObject,
			credentials.region as string,
		);
	});

	try {
		await node.execute!.call(context);
	} catch (error) {
		requests.push({ error: (error as Error).message });
	}
	return requests;
}

const strayPercent = /%(?![0-9A-Fa-f]{2})/;
const strayPercentGlobal = new RegExp(strayPercent.source, 'g');

const rawInLegacyPath = /[[\]|;]/;
const encodeRawPathCharacters = (url: string) =>
	url.replace(/^[^?]*/, (path) =>
		path.replace(/[[\]|;]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`),
	);

const hasDotSegment = (key: string) =>
	key.split(/[/\\]/).some((part) => part === '.' || part === '..');

describe('AWS S3 request regression', () => {
	beforeAll(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-12T12:00:00Z') });
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	const nodes = {
		1: { current: new AwsS3V1(baseDescription), legacy: new LegacyAwsS3V1(baseDescription) },
		2: { current: new AwsS3V2(baseDescription), legacy: new LegacyAwsS3V2(baseDescription) },
	};

	describe.each([
		['default signer', 'false'],
		['legacy signer', 'true'],
	])('%s', (_mode, legacySigner) => {
		beforeAll(() => {
			vi.stubEnv('N8N_AWS_LEGACY_SIGNER', legacySigner);
		});

		afterAll(() => {
			vi.unstubAllEnvs();
		});

		describe.each([1, 2])('V%i', (version) => {
			const { current, legacy } = nodes[version as 1 | 2];

			describe.each(Object.keys(credentialConfigs))('%s', (configName) => {
				const credentials = credentialConfigs[configName];

				test.each(bucketNames)(
					'bucket "%s" sends the same requests',
					async (bucketName) => {
						for (const key of objectKeys) {
							for (const operation of operations(bucketName, key)) {
								if (!operation.versions.includes(version)) continue;
								const label = `${operation.name} with key "${key}"`;
								const actual = await capture(current, version, operation.parameters, credentials);

								if (operation.keyInPath && hasDotSegment(key)) {
									// Expected difference: "." and ".." key parts are rejected.
									// Before, the URL parser removed them and S3 used a different key.
									expect(actual.at(-1), label).toEqual({
										error: expect.stringContaining('Invalid'),
									});
									continue;
								}

								const downloadsFolder = operation.name === 'file download' && key.endsWith('/');
								expect(
									actual.filter((request) => 'error' in request),
									label,
								).toHaveLength(downloadsFolder ? 1 : 0);
								expect(
									actual.some((request) => 'url' in request),
									label,
								).toBe(!downloadsFolder);

								const runLegacy = async (legacyKey: string) =>
									await capture(
										legacy,
										version,
										operations(bucketName, legacyKey).find(
											(candidate) => candidate.name === operation.name,
										)!.parameters,
										credentials,
									);
								const encodePlus = (legacyKey: string) => legacyKey.replace(/\+/g, '%2B');
								const runLegacyWithEncodedPlus = async (legacyKey: string) => {
									const raw = await runLegacy(legacyKey);
									if (!operation.keyInPath || legacySigner !== 'true' || !legacyKey.includes('+')) {
										return raw;
									}
									// Expected difference with the legacy signer: "+" in an object key path is sent and
									// signed as "%2B". Before, it was sent and signed as "+". The legacy code gets "%2B" to
									// match. A listing request keeps the key in the query string, which stays unchanged.
									const encoded = await runLegacy(encodePlus(legacyKey));
									return encoded.map((request, index) =>
										'url' in request && request.url?.includes('list-type') ? raw[index] : request,
									);
								};
								let expected = await runLegacyWithEncodedPlus(key);

								if (operation.keyInPath && legacySigner === 'true' && strayPercent.test(key)) {
									// Expected difference with the legacy signer: a "%" that does not start an
									// escape is sent as "%25". Before, the legacy signer failed with "URI malformed".
									expect(expected.at(-1), label).toEqual({ error: 'URI malformed' });
									const original = expected;
									const encoded = await runLegacyWithEncodedPlus(
										key.replace(strayPercentGlobal, '%25'),
									);
									expected = encoded.map((request, index) =>
										isEqual(original[index], actual[index]) ? original[index] : request,
									);
								}

								if (operation.keyInPath && legacySigner === 'true' && rawInLegacyPath.test(key)) {
									// Expected difference with the legacy signer: "[", "]", "|" and ";" in a key are
									// percent-encoded in the path. Before, they were sent raw. The signature is the same.
									expected = expected.map((request) =>
										'url' in request && request.url
											? { ...request, url: encodeRawPathCharacters(request.url) }
											: request,
									);
								}

								if (operation.name === 'file upload multipart') {
									expect(
										actual.some(
											(request) => 'url' in request && request.url?.endsWith('?uploads='),
										),
										label,
									).toBe(true);
									// Expected difference: "?uploads" is sent as "?uploads=". The signature is the same.
									expected = expected.map((request) =>
										'url' in request && request.url
											? { ...request, url: request.url.replace(/\?uploads$/, '?uploads=') }
											: request,
									);
								}

								expect(actual, label).toEqual(expected);
							}
						}
					},
					120_000,
				);
			});
		});
	});
});
