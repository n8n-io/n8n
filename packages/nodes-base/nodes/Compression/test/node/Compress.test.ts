import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, IBinaryData } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { Compression } from '../../Compression.node';
import { createTar } from '../../compress/CreateTar';

vi.mock('../../compress/CreateTar');

describe('Compression Node - Compress Operation', () => {
	let compression: Compression;
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	const mockNode: INode = {
		id: 'test-node',
		name: 'Compression',
		type: 'n8n-nodes-base.compression',
		typeVersion: 1.1,
		position: [0, 0],
		parameters: {},
	};

	const setParams = (outputFormat: string, binaryPropertyName = 'data') => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params: Record<string, string> = {
				operation: 'compress',
				binaryPropertyName,
				outputFormat,
				fileName: 'archive.tar',
				binaryPropertyOutput: 'data',
			};
			return params[paramName];
		});
	};

	beforeEach(() => {
		compression = new Compression();
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		vi.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { test: 'data' } }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		vi.mocked(mockExecuteFunctions.helpers.assertBinaryData).mockReturnValue({
			data: 'base64data',
			mimeType: 'text/plain',
			fileName: 'a.txt',
			fileExtension: 'txt',
		} as IBinaryData);
		vi.mocked(mockExecuteFunctions.helpers.getBinaryDataBuffer).mockResolvedValue(
			Buffer.from('hello'),
		);
		vi.mocked(mockExecuteFunctions.helpers.prepareBinaryData).mockResolvedValue({
			data: 'dGFy',
			mimeType: 'application/x-tar',
			fileName: 'archive.tar',
			fileExtension: 'tar',
		} as IBinaryData);
		vi.mocked(createTar).mockResolvedValue(Buffer.from('tar-bytes'));
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should compress to an uncompressed tar archive', async () => {
		setParams('tar');

		const result = await compression.execute.call(mockExecuteFunctions);

		expect(createTar).toHaveBeenCalledTimes(1);
		expect(createTar).toHaveBeenCalledWith([{ fileName: 'a.txt', data: Buffer.from('hello') }], {
			gzip: false,
		});
		expect(result[0][0].binary?.data).toBeDefined();
	});

	it('should compress to a gzip-compressed tar archive', async () => {
		setParams('targz');

		await compression.execute.call(mockExecuteFunctions);

		expect(createTar).toHaveBeenCalledWith([{ fileName: 'a.txt', data: Buffer.from('hello') }], {
			gzip: true,
		});
	});

	it('should bundle multiple input fields into a single tar archive', async () => {
		setParams('tar', 'data1,data2');

		await compression.execute.call(mockExecuteFunctions);

		expect(createTar).toHaveBeenCalledTimes(1);
		const [files] = vi.mocked(createTar).mock.calls[0];
		expect(files).toHaveLength(2);
	});
});
