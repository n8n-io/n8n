import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IExecuteFunctions } from 'n8n-workflow';

import { EmailSendV2, versionDescription } from '../../v2/EmailSendV2.node';
import * as utils from '../../v2/utils';
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
	let emailSendV2: EmailSendV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		emailSendV2 = new EmailSendV2(versionDescription);
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should handle "auto" attachment disposition: referenced in HTML -> inline', async () => {
		const items = [
			{
				json: { data: 'test' },
				binary: { image: { data: '...', fileName: 'image.png', mimeType: 'image/png' } },
			},
		];

		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2 } as any);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		// getNodeParameter mocks
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'send';
			if (paramName === 'fromEmail') return 'from@mail.com';
			if (paramName === 'toEmail') return 'to@mail.com';
			if (paramName === 'subject') return 'subject';
			if (paramName === 'emailFormat') return 'html';
			if (paramName === 'html') return '<html><img src="cid:image" /></html>';
			if (paramName === 'options')
				return {
					attachments: 'image',
					attachmentDisposition: 'auto',
				};
			return '';
		});

		// helpers mocks
		mockExecuteFunctions.helpers = {
			assertBinaryData: jest.fn().mockReturnValue({ fileName: 'image.png' }),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('datan')),
		} as any;

		const result = await emailSendV2.execute.call(mockExecuteFunctions);

		expect(transporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				attachments: [
					expect.objectContaining({
						cid: 'image',
					}),
				],
			}),
		);
	});

	it('should handle "auto" attachment disposition: NOT referenced in HTML -> attachment', async () => {
		const items = [
			{
				json: { data: 'test' },
				binary: { image: { data: '...', fileName: 'image.png', mimeType: 'image/png' } },
			},
		];

		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2 } as any);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		// getNodeParameter mocks
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'send';
			if (paramName === 'fromEmail') return 'from@mail.com';
			if (paramName === 'toEmail') return 'to@mail.com';
			if (paramName === 'subject') return 'subject';
			if (paramName === 'emailFormat') return 'html';
			if (paramName === 'html') return '<html>No image reference</html>';
			if (paramName === 'options')
				return {
					attachments: 'image',
					attachmentDisposition: 'auto',
				};
			return '';
		});

		// helpers mocks
		mockExecuteFunctions.helpers = {
			assertBinaryData: jest.fn().mockReturnValue({ fileName: 'image.png' }),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('datan')),
		} as any;

		await emailSendV2.execute.call(mockExecuteFunctions);

		expect(transporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				attachments: [
					expect.not.objectContaining({
						cid: expect.anything(),
					}),
				],
			}),
		);
	});

	it('should handle "inline" attachment disposition: always inline', async () => {
		const items = [
			{
				json: { data: 'test' },
				binary: { image: { data: '...', fileName: 'image.png', mimeType: 'image/png' } },
			},
		];

		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2 } as any);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		// getNodeParameter mocks
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'send';
			if (paramName === 'fromEmail') return 'from@mail.com';
			if (paramName === 'toEmail') return 'to@mail.com';
			if (paramName === 'subject') return 'subject';
			if (paramName === 'emailFormat') return 'html';
			if (paramName === 'html') return '<html>No reference</html>'; // Even if not referenced
			if (paramName === 'options')
				return {
					attachments: 'image',
					attachmentDisposition: 'inline',
				};
			return '';
		});

		// helpers mocks
		mockExecuteFunctions.helpers = {
			assertBinaryData: jest.fn().mockReturnValue({ fileName: 'image.png' }),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('datan')),
		} as any;

		await emailSendV2.execute.call(mockExecuteFunctions);

		expect(transporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				attachments: [
					expect.objectContaining({
						cid: 'image',
					}),
				],
			}),
		);
	});

	it('should handle "attachment" attachment disposition: always attachment', async () => {
		const items = [
			{
				json: { data: 'test' },
				binary: { image: { data: '...', fileName: 'image.png', mimeType: 'image/png' } },
			},
		];

		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.getNode.mockReturnValue({ typeVersion: 2 } as any);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		// getNodeParameter mocks
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'send';
			if (paramName === 'fromEmail') return 'from@mail.com';
			if (paramName === 'toEmail') return 'to@mail.com';
			if (paramName === 'subject') return 'subject';
			if (paramName === 'emailFormat') return 'html';
			if (paramName === 'html') return '<html><img src="cid:image" /></html>'; // Even if referenced
			if (paramName === 'options')
				return {
					attachments: 'image',
					attachmentDisposition: 'attachment',
				};
			return '';
		});

		// helpers mocks
		mockExecuteFunctions.helpers = {
			assertBinaryData: jest.fn().mockReturnValue({ fileName: 'image.png' }),
			getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('datan')),
		} as any;

		await emailSendV2.execute.call(mockExecuteFunctions);

		expect(transporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				attachments: [
					expect.not.objectContaining({
						cid: expect.anything(),
					}),
				],
			}),
		);
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
