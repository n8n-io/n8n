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
				.mockReturnValueOnce(
					'<img src="cid:file1"><img src="cid:file2"><img src="cid:file3"><p>Test HTML</p>',
				);

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
				.mockReturnValueOnce('<img src="cid:file1"><img src="cid:file2"><p>Test HTML</p>');

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
				.mockReturnValueOnce('<img src="cid:file1"><img src="cid:file2"><p>Test HTML</p>');

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
				.mockReturnValueOnce('<img src="cid:singleFile"><p>Test HTML</p>');

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
				.mockReturnValueOnce('<img src="cid:file1"><img src="cid:file2"><p>Test HTML</p>');

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

	describe('inline attachment cid disposition', () => {
		it('should NOT set cid on attachment when HTML body does not reference it', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						attachment: {
							data: 'data1',
							mimeType: 'application/pdf',
							fileName: 'document.pdf',
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
				.mockReturnValueOnce({ attachments: 'attachment', appendAttribution: false })
				// HTML body does NOT reference the attachment via cid
				.mockReturnValueOnce('<p>Please find the document attached.</p>');

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

			// The attachment should NOT have cid set — it's a regular attachment, not inline
			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						expect.objectContaining({ filename: 'document.pdf' }),
					],
				}),
			);
			const callArgs = transporter.sendMail.mock.calls[0][0];
			expect(callArgs.attachments[0]).not.toHaveProperty('cid');
		});

		it('should set cid on attachment when HTML body references it via cid:', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						logo: {
							data: 'imagedata',
							mimeType: 'image/png',
							fileName: 'logo.png',
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
				.mockReturnValueOnce({ attachments: 'logo', appendAttribution: false })
				// HTML body DOES reference the attachment via cid:logo
				.mockReturnValueOnce('<p>Hello</p><img src="cid:logo" />');

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

			// The attachment SHOULD have cid set — it's referenced inline in the HTML
			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [expect.objectContaining({ filename: 'logo.png', cid: 'logo' })],
				}),
			);
		});

		it('should set cid only on attachments referenced in the HTML body (mixed case)', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						inlineImage: {
							data: 'imagedata',
							mimeType: 'image/png',
							fileName: 'banner.png',
						} as IBinaryData,
						regularAttachment: {
							data: 'pdfdata',
							mimeType: 'application/pdf',
							fileName: 'report.pdf',
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
				.mockReturnValueOnce({
					attachments: 'inlineImage, regularAttachment',
					appendAttribution: false,
				})
				// HTML references inlineImage but NOT regularAttachment
				.mockReturnValueOnce('<img src="cid:inlineImage"><p>See the attached report.</p>');

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

			const callArgs = transporter.sendMail.mock.calls[0][0];

			// inlineImage should have cid set (referenced in HTML)
			expect(callArgs.attachments[0]).toMatchObject({ filename: 'banner.png', cid: 'inlineImage' });

			// regularAttachment should NOT have cid set (not referenced in HTML)
			expect(callArgs.attachments[1]).toMatchObject({ filename: 'report.pdf' });
			expect(callArgs.attachments[1]).not.toHaveProperty('cid');
		});

		it('should not set cid on attachments when email format is text (no HTML body)', async () => {
			const items = [
				{
					json: { data: 'test' },
					binary: {
						attachment: {
							data: 'data1',
							mimeType: 'application/pdf',
							fileName: 'document.pdf',
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
				.mockReturnValueOnce('text') // text format — no HTML body
				.mockReturnValueOnce({ attachments: 'attachment', appendAttribution: false })
				.mockReturnValueOnce('Please find the document attached.'); // plain text

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

			const callArgs = transporter.sendMail.mock.calls[0][0];

			// In text-format email, no inline embedding possible — no cid should be set
			expect(callArgs.attachments[0]).not.toHaveProperty('cid');
		});
	});
});
