import type { IExecuteFunctions, IBinaryData } from 'n8n-workflow';

import { EmailSendV1 } from '../../v1/EmailSendV1.node';
import { prepareBinariesDataList } from '../../../../utils/binary';

const transporter = { sendMail: jest.fn() };

jest.mock('nodemailer', () => ({
	createTransport: jest.fn(() => transporter),
}));

describe('Test EmailSendV1', () => {
	let emailSendV1: EmailSendV1;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		emailSendV1 = new EmailSendV1({
			description: {
				displayName: 'Send Email',
				name: 'emailSend',
				icon: 'fa:envelope',
				group: ['output'],
				description: 'Sends an Email',
				version: 1,
				defaults: {
					name: 'Send Email',
					color: '#00bb88',
				},
			},
		} as any);

		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getCredentials: jest.fn(),
			getNodeParameter: jest.fn(),
			helpers: {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
			},
			continueOnFail: jest.fn(() => false),
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('file1, file2, file3')
				.mockReturnValueOnce({});

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

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt' }),
						expect.objectContaining({ filename: 'file2.txt' }),
						expect.objectContaining({ filename: 'file3.txt' }),
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('file1,file2')
				.mockReturnValueOnce({});

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

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt' }),
						expect.objectContaining({ filename: 'file2.txt' }),
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('  file1  ,  file2  ')
				.mockReturnValueOnce({});

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

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'file1.txt' }),
						expect.objectContaining({ filename: 'file2.txt' }),
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('singleFile')
				.mockReturnValueOnce({});

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

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [expect.objectContaining({ filename: 'single.txt' })],
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('file1, file2')
				.mockReturnValueOnce({});

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

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: expect.arrayContaining([
						expect.objectContaining({ filename: 'file1.txt' }),
						expect.objectContaining({ filename: 'file2.txt' }),
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce(binaryDataObject)
				.mockReturnValueOnce({});

			// Mock helpers to handle IBinaryData objects directly
			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					// If propertyName is already an IBinaryData object, return it
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					// Otherwise look it up in binary data
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					// If propertyName is already an IBinaryData object, use it directly
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV1.execute.call(mockExecuteFunctions);

			const result = prepareBinariesDataList(binaryDataObject);
			expect(result).toEqual([binaryDataObject]);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [expect.objectContaining({ filename: 'file1.txt' })],
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
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce(binaryDataArray)
				.mockReturnValueOnce({});

			// Mock helpers to handle IBinaryData objects directly
			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockImplementation(
				(itemIndex: number, propertyName: string | IBinaryData) => {
					// If propertyName is already an IBinaryData object, return it
					if (typeof propertyName === 'object') {
						return propertyName;
					}
					// Otherwise look it up in binary data
					return items[itemIndex].binary![propertyName];
				},
			);

			(mockExecuteFunctions.helpers.getBinaryDataBuffer as jest.Mock).mockImplementation(
				async (itemIndex: number, propertyName: string | IBinaryData) => {
					// If propertyName is already an IBinaryData object, use it directly
					const binaryData =
						typeof propertyName === 'object'
							? propertyName
							: items[itemIndex].binary![propertyName];
					return Buffer.from(binaryData.data);
				},
			);

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV1.execute.call(mockExecuteFunctions);

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
		it('should send email when attachment string is empty', async () => {
			const items = [{ json: { data: 'test' } }];

			mockExecuteFunctions.getInputData.mockReturnValue(items);
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				host: 'smtp.example.com',
				port: 587,
				secure: false,
			});

			mockExecuteFunctions.getNodeParameter
				.mockReturnValueOnce('from@example.com')
				.mockReturnValueOnce('to@example.com')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('')
				.mockReturnValueOnce('Test Subject')
				.mockReturnValueOnce('Test text')
				.mockReturnValueOnce('<p>Test HTML</p>')
				.mockReturnValueOnce('')
				.mockReturnValueOnce({});

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV1.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.not.objectContaining({
					attachments: expect.anything(),
				}),
			);
		});
	});
});
