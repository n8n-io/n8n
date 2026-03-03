import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import * as sendOperation from '../../v2/send.operation';
import { prepareBinariesDataList } from '../../../../utils/binary';

const transporter = { sendMail: jest.fn() };

jest.mock('../../v2/utils', () => {
	const originalModule = jest.requireActual('../../v2/utils');
	return {
		...originalModule,
		configureTransport: jest.fn(() => transporter),
	};
});

describe('Test EmailSendV2, send operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNode: jest.fn(),
			getInstanceId: jest.fn(),
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
			},
		} as unknown as jest.Mocked<IExecuteFunctions>;
		jest.clearAllMocks();
	});

	describe('comma-separated attachment strings', () => {
		it('should process comma-separated attachment names with spaces', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
						file3: { data: 'data3', mimeType: 'text/plain', fileName: 'file3.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: 'file1, file2, file3', appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt', cid: 'file1' }),
						expect.objectContaining({ filename: 'file2.txt', cid: 'file2' }),
						expect.objectContaining({ filename: 'file3.txt', cid: 'file3' }),
					],
				}),
			);
		});

		it('should process comma-separated attachment names without spaces', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: 'file1,file2', appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt', cid: 'file1' }),
						expect.objectContaining({ filename: 'file2.txt', cid: 'file2' }),
					],
				}),
			);
		});

		it('should trim extra spaces from attachment names', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: '  file1  ,  file2  ', appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt', cid: 'file1' }),
						expect.objectContaining({ filename: 'file2.txt', cid: 'file2' }),
					],
				}),
			);
		});

		it('should process single attachment name', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						singleFile: {
							data: 'data1',
							mimeType: 'text/plain',
							fileName: 'single.txt',
						} as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: 'singleFile', appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [expect.objectContaining({ filename: 'single.txt', cid: 'singleFile' })],
				}),
			);
		});
	});

	describe('prepareBinariesDataList helper function', () => {
		it('should process string attachment names correctly', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						file1: { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' } as IBinaryData,
						file2: { data: 'data2', mimeType: 'text/plain', fileName: 'file2.txt' } as IBinaryData,
					} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: 'file1, file2', appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string) => {
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string) => {
					return Buffer.from(items[itemIndex].binary![propertyName].data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			const result = prepareBinariesDataList('file1, file2');
			expect(result).toEqual(['file1', 'file2']);

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: expect.arrayContaining([
						expect.objectContaining({ cid: 'file1' }),
						expect.objectContaining({ cid: 'file2' }),
					]),
				}),
			);
		});

		it('should wrap IBinaryData object in array', () => {
			const input = { data: 'data1', mimeType: 'text/plain', fileName: 'file.txt' };
			const result = prepareBinariesDataList(input);
			expect(result).toEqual([input]);
			expect(result).toHaveLength(1);
		});

		it('should return IBinaryData array unchanged', () => {
			const input = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
			];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(input);
			expect(result).toHaveLength(2);
		});

		it('should return string array unchanged', () => {
			const input = ['file1', 'file2', 'file3'];
			const result = prepareBinariesDataList(input);
			expect(result).toEqual(['file1', 'file2', 'file3']);
		});

		it('should process IBinaryData object as attachment', async () => {
			const binaryDataObject = { data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' };
			const items = [
				{
					json: { data: 'test' },
					binary: {} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: binaryDataObject, appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			const result = prepareBinariesDataList(binaryDataObject);
			expect(result).toEqual([binaryDataObject]);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [expect.objectContaining({ filename: 'file1.txt', cid: binaryDataObject })],
				}),
			);
		});

		it('should process IBinaryData array as attachments', async () => {
			const binaryDataArray = [
				{ data: 'data1', mimeType: 'text/plain', fileName: 'file1.txt' },
				{ data: 'data2', mimeType: 'image/png', fileName: 'file2.png' },
			];
			const items = [
				{
					json: { data: 'test' },
					binary: {} as Record<string, IBinaryData>,
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ attachments: binaryDataArray, appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			const result = prepareBinariesDataList(binaryDataArray);
			expect(result).toEqual(binaryDataArray);
			expect(result).toHaveLength(2);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt' }),
						expect.objectContaining({ filename: 'file2.png' }),
					],
				}),
			);
		});
	});

	describe('emails without attachments', () => {
		it('should send email when no attachments specified', async () => {
			const items = [{ json: { data: 'test' } }];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2.0 } as any);
			mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('html')
				.mockReturnValueOnce({ appendAttribution: false })
				.mockReturnValueOnce('<p>Test HTML</p>');

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await sendOperation.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.not.objectContaining({
					attachments: expect.anything(),
				}),
			);
		});
	});
});
