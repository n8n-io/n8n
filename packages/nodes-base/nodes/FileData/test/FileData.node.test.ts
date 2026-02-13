import { mockDeep } from 'jest-mock-extended';
import type { IBinaryData, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Readable } from 'stream';

import { FileData } from '../FileData.node';

describe('FileData Node', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();
	const node = new FileData();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('should output binary data for a single item', async () => {
		const mockStream = Readable.from(Buffer.from('file-content'));
		const mockBinaryData: IBinaryData = {
			data: 'base64data',
			mimeType: 'text/plain',
			fileName: 'test.txt',
		};

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'fileId':
					return 'binary:abc123';
				case 'fileName':
					return 'test.txt';
				case 'mimeType':
					return 'text/plain';
				case 'dataPropertyName':
					return 'data';
				default:
					return '';
			}
		});
		executeFunctions.helpers.getBinaryStream.mockResolvedValue(mockStream);
		executeFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

		const result = await node.execute.call(executeFunctions);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual({ fileName: 'test.txt', mimeType: 'text/plain' });
		expect(result[0][0].binary).toEqual({ data: mockBinaryData });
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
		expect(executeFunctions.helpers.getBinaryStream).toHaveBeenCalledWith('binary:abc123');
		expect(executeFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
			mockStream,
			'test.txt',
			'text/plain',
		);
	});

	it('should use custom property name for binary data', async () => {
		const mockStream = Readable.from(Buffer.from('file-content'));
		const mockBinaryData: IBinaryData = {
			data: 'base64data',
			mimeType: 'image/png',
			fileName: 'photo.png',
		};

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'fileId':
					return 'binary:def456';
				case 'fileName':
					return 'photo.png';
				case 'mimeType':
					return 'image/png';
				case 'dataPropertyName':
					return 'attachment';
				default:
					return '';
			}
		});
		executeFunctions.helpers.getBinaryStream.mockResolvedValue(mockStream);
		executeFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

		const result = await node.execute.call(executeFunctions);

		expect(result[0][0].binary).toEqual({ attachment: mockBinaryData });
	});

	it('should process multiple items with correct pairedItem indices', async () => {
		const items: INodeExecutionData[] = [{ json: {} }, { json: {} }];
		const mockStream = Readable.from(Buffer.from('content'));
		const mockBinaryData: IBinaryData = {
			data: 'base64',
			mimeType: 'text/plain',
			fileName: 'file.txt',
		};

		executeFunctions.getInputData.mockReturnValue(items);
		executeFunctions.getNodeParameter.mockImplementation((paramName: string, idx: number) => {
			switch (paramName) {
				case 'fileId':
					return `binary:file${idx}`;
				case 'fileName':
					return `file${idx}.txt`;
				case 'mimeType':
					return 'text/plain';
				case 'dataPropertyName':
					return 'data';
				default:
					return '';
			}
		});
		executeFunctions.helpers.getBinaryStream.mockResolvedValue(mockStream);
		executeFunctions.helpers.prepareBinaryData.mockResolvedValue(mockBinaryData);

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
		expect(result[0][1].pairedItem).toEqual({ item: 1 });
	});

	it('should return error item when continueOnFail is true', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'fileId':
					return 'binary:bad';
				case 'fileName':
					return 'bad.txt';
				case 'mimeType':
					return 'text/plain';
				case 'dataPropertyName':
					return 'data';
				default:
					return '';
			}
		});
		executeFunctions.helpers.getBinaryStream.mockRejectedValue(new Error('Stream failed'));
		executeFunctions.continueOnFail.mockReturnValue(true);

		const result = await node.execute.call(executeFunctions);

		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual({ error: 'Stream failed' });
		expect(result[0][0].pairedItem).toEqual({ item: 0 });
		expect(result[0][0].binary).toBeUndefined();
	});

	it('should throw error when continueOnFail is false', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'fileId':
					return 'binary:bad';
				case 'fileName':
					return 'bad.txt';
				case 'mimeType':
					return 'text/plain';
				case 'dataPropertyName':
					return 'data';
				default:
					return '';
			}
		});
		executeFunctions.helpers.getBinaryStream.mockRejectedValue(new Error('Stream failed'));
		executeFunctions.continueOnFail.mockReturnValue(false);

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('Stream failed');
	});
});
