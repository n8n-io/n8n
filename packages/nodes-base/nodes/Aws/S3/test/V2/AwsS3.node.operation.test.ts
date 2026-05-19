// ✅ KEEP THIS (your feature)
describe('AWS S3 V2 Node - Bucket Delete', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	let node: AwsS3V2;

	beforeAll(() => {
		awsApiRequestRESTSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');
	});

	afterAll(() => {
		awsApiRequestRESTSpy.mockRestore();
	});

	beforeEach(() => {
		jest.resetAllMocks();
		node = new AwsS3V2({
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

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 2 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);

		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);

		executeFunctionsMock.getNodeParameter.mockImplementation((paramName) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'delete';
				case 'name':
					return 'my-test-bucket';
				default:
					return undefined;
			}
		});
	});

	it('should send DELETE request and return success (204)', async () => {
		awsApiRequestRESTSpy.mockResolvedValueOnce(undefined);

		const result = await node.execute.call(executeFunctionsMock);

		expect(awsApiRequestRESTSpy).toHaveBeenCalledWith(
			'my-test-bucket.s3',
			'DELETE',
			'',
			'',
			{},
			{},
		);

		expect(result[0][0]).toMatchObject({ json: { success: true } });
	});

	it('should handle empty string response (204)', async () => {
		awsApiRequestRESTSpy.mockResolvedValueOnce('');

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0]).toMatchObject({ json: { success: true } });
	});
});


// ✅ KEEP THIS (from master)
describe('AWS S3 V2 Node - Bucket Search', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const awsApiRequestRESTSpy = jest.spyOn(GenericFunctions, 'awsApiRequestREST');
	const awsApiRequestRESTAllItemsSpy = jest.spyOn(
		GenericFunctions,
		'awsApiRequestRESTAllItems',
	);
	let node: AwsS3V2;

	const mockContents = [
		{ Key: 'file1.txt', Size: '100' },
		{ Key: 'file2.txt', Size: '200' },
	];

	const mockCommonPrefixes = [
		{ Prefix: 'folder1/' },
		{ Prefix: 'folder2/' },
	];

	const mockSearchResponse = {
		ListBucketResult: {
			Contents: mockContents,
			CommonPrefixes: mockCommonPrefixes,
		},
	};

	beforeEach(() => {
		jest.resetAllMocks();
		node = new AwsS3V2({
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

		executeFunctionsMock.getNode.mockReturnValue({ typeVersion: 2 } as INode);
		executeFunctionsMock.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctionsMock.continueOnFail.mockReturnValue(false);

		executeFunctionsMock.helpers.returnJsonArray.mockImplementation((data) =>
			Array.isArray(data) ? data.map((item) => ({ json: item })) : [{ json: data }],
		);

		executeFunctionsMock.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as any,
		);
	});

	function setupSearchParams({ returnAll = false, delimiter = '', includeCommonPrefixes = false, limit = 100 }) {
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName, _i, defaultVal?) => {
			switch (paramName) {
				case 'resource':
					return 'bucket';
				case 'operation':
					return 'search';
				case 'bucketName':
					return 'test-bucket';
				case 'returnAll':
					return returnAll;
				case 'limit':
					return limit;
				case 'additionalFields':
					return { delimiter, includeCommonPrefixes };
				default:
					return defaultVal ?? undefined;
			}
		});
	}

	it('should return contents', async () => {
		setupSearchParams({});
		awsApiRequestRESTSpy
			.mockResolvedValueOnce(mockLocationResponse)
			.mockResolvedValueOnce(mockSearchResponse);

		const result = await node.execute.call(executeFunctionsMock);

		expect(result[0][0].json).toEqual(mockContents[0]);
	});
});