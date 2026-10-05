import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { AwsS3V1 } from '../../V1/AwsS3V1.node';
import * as GenericFunctions from '../../V1/GenericFunctions';
import type { MockInstance } from 'vitest';

describe('AWS S3 V1 Node - File Copy', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let awsApiRequestSOAPSpy: MockInstance;
	let node: AwsS3V1;

	const copyWithSource = (sourcePath: string) => {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'file';
				case 'operation':
					return 'copy';
				case 'sourcePath':
					return sourcePath;
				case 'destinationPath':
					return '/test-bucket/backup/index.txt';
				case 'additionalFields':
					return {};
				default:
					return undefined;
			}
		});
	};

	const copySourceHeader = () =>
		awsApiRequestSOAPSpy.mock.calls[1][5]['x-amz-copy-source'] as string;

	beforeEach(() => {
		vi.resetAllMocks();
		awsApiRequestSOAPSpy = vi.spyOn(GenericFunctions, 'awsApiRequestSOAP');
		node = new AwsS3V1({
			displayName: 'AWS S3',
			name: 'awsS3',
			icon: 'file:s3.svg',
			group: ['output'],
			description: 'Sends data to AWS S3',
		});

		executeFunctionsMock.getCredentials.mockResolvedValue({
			accessKeyId: 'test-key',
			secretAccessKey: 'test-secret',
			region: 'eu-central-1',
		});
		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 1 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);
		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);
		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);

		awsApiRequestSOAPSpy
			.mockResolvedValueOnce({ LocationConstraint: { _: 'eu-central-1' } })
			.mockResolvedValueOnce({ CopyObjectResult: {} });
	});

	// An HTTP header cannot carry a non-ASCII byte. The signature is computed over
	// the value we set, so if the client rewrites it on the way out, S3 sees a
	// different path and answers SignatureDoesNotMatch.
	it.each([
		[
			'Chinese characters',
			'/test-bucket/workflow/同程商旅/index.txt',
			'/test-bucket/workflow/%E5%90%8C%E7%A8%8B%E5%95%86%E6%97%85/index.txt',
		],
		['an accented name', '/test-bucket/résumé.pdf', '/test-bucket/r%C3%A9sum%C3%A9.pdf'],
		['a space', '/test-bucket/my report.pdf', '/test-bucket/my%20report.pdf'],
	])('percent-encodes the copy source for %s', async (_name, sourcePath, expected) => {
		copyWithSource(sourcePath);

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe(expected);
	});

	it('leaves an all-ASCII source path byte-identical', async () => {
		copyWithSource('/test-bucket/workflow/index.txt');

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe('/test-bucket/workflow/index.txt');
	});

	it('does not double-encode a source path the user already encoded', async () => {
		copyWithSource('/test-bucket/my%20report.pdf');

		await node.execute.call(executeFunctionsMock);

		expect(copySourceHeader()).toBe('/test-bucket/my%20report.pdf');
	});
});
