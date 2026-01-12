import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { IBinaryData, IExecuteFunctions } from 'n8n-workflow';

import { EmailSendV2, versionDescription } from '../../v2/EmailSendV2.node';

const transporter = { sendMail: jest.fn() };

jest.mock('../../v2/utils', () => {
	const originalModule = jest.requireActual('../../v2/utils');
	return {
		...originalModule,
		configureTransport: jest.fn(() => transporter),
	};
});

describe('Test EmailSendV2, email => send', () => {
	let emailSendV2: EmailSendV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const setupMockParameters = (params: Record<string, any>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'operation') return 'send';
			if (params[paramName] !== undefined) return params[paramName];
			if (paramName === 'options') return params.options || {};
			return '';
		});
	};

	beforeEach(() => {
		emailSendV2 = new EmailSendV2(versionDescription);
		mockExecuteFunctions = mock<IExecuteFunctions>();

		// Default common mocks
		mockExecuteFunctions.getCredentials.mockResolvedValue({});
		mockExecuteFunctions.getInstanceId.mockReturnValue('test-instance-id');
		mockExecuteFunctions.getNode.mockReturnValue({
			type: 'n8n-nodes-base.emailSend',
			typeVersion: 2.1,
			name: 'Send Email',
		} as any);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Attachment Processing - String Property Names (Backward Compatibility)', () => {
		it('should handle single property name', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: 'data' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					from: 'from@example.com',
					to: 'to@example.com',
					subject: 'Test Subject',
					text: 'Test message',
					attachments: [
						{
							filename: 'test.png',
							content: Buffer.from('test-content'),
							cid: 'data',
						},
					],
				}),
			);
		});

		it('should handle multiple comma-separated property names', async () => {
			const binaryData1: IBinaryData = {
				data: 'base64data1',
				mimeType: 'image/png',
				fileName: 'file1.png',
			};

			const binaryData2: IBinaryData = {
				data: 'base64data2',
				mimeType: 'application/pdf',
				fileName: 'file2.pdf',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData1, file2: binaryData2 },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: 'data, file2' },
			});

			// Mock binary helpers
			mockExecuteFunctions.helpers = {
				assertBinaryData: jest
					.fn()
					.mockReturnValueOnce(binaryData1)
					.mockReturnValueOnce(binaryData2),
				getBinaryDataBuffer: jest
					.fn()
					.mockResolvedValueOnce(Buffer.from('content1'))
					.mockResolvedValueOnce(Buffer.from('content2')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						{
							filename: 'file1.png',
							content: Buffer.from('content1'),
							cid: 'data',
						},
						{
							filename: 'file2.pdf',
							content: Buffer.from('content2'),
							cid: 'file2',
						},
					],
				}),
			);
		});

		it('should trim whitespace from property names', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: '  data  ' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		});

		it('should filter out empty strings from comma-separated list', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: 'data, , ' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			// Should only call assertBinaryData once for 'data', not for empty strings
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledTimes(1);
			expect(mockExecuteFunctions.helpers.assertBinaryData).toHaveBeenCalledWith(0, 'data');
		});
	});

	describe('Attachment Processing - Expression-Resolved Binary Data', () => {
		it('should handle single IBinaryData object from expression', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: binaryData },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						{
							filename: 'test.png',
							content: Buffer.from('test-content'),
							cid: 'test.png', // Uses fileName as CID for objects
						},
					],
				}),
			);
		});

		it('should handle array of IBinaryData objects from expression', async () => {
			const binaryData1: IBinaryData = {
				data: 'base64data1',
				mimeType: 'image/png',
				fileName: 'file1.png',
			};

			const binaryData2: IBinaryData = {
				data: 'base64data2',
				mimeType: 'application/pdf',
				fileName: 'file2.pdf',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { file1: binaryData1, file2: binaryData2 },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: [binaryData1, binaryData2] },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest
					.fn()
					.mockReturnValueOnce(binaryData1)
					.mockReturnValueOnce(binaryData2),
				getBinaryDataBuffer: jest
					.fn()
					.mockResolvedValueOnce(Buffer.from('content1'))
					.mockResolvedValueOnce(Buffer.from('content2')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						{
							filename: 'file1.png',
							content: Buffer.from('content1'),
							cid: 'file1.png',
						},
						{
							filename: 'file2.pdf',
							content: Buffer.from('content2'),
							cid: 'file2.pdf',
						},
					],
				}),
			);
		});

		it('should use "attachment" as CID when binary object has no fileName', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/octet-stream',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: binaryData },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					attachments: [
						{
							filename: 'unknown',
							content: Buffer.from('test-content'),
							cid: 'attachment',
						},
					],
				}),
			);
		});
	});

	describe('Email Format Compatibility', () => {
		it('should attach files to HTML emails', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'image/png',
				fileName: 'test.png',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'html',
				html: '<p>Test message</p>',
				options: { appendAttribution: false, attachments: 'data' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					html: '<p>Test message</p>',
					attachments: [
						{
							filename: 'test.png',
							content: Buffer.from('test-content'),
							cid: 'data',
						},
					],
				}),
			);
		});

		it('should attach files to text emails', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/pdf',
				fileName: 'document.pdf',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: 'data' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					text: 'Test message',
					attachments: [
						{
							filename: 'document.pdf',
							content: Buffer.from('pdf-content'),
							cid: 'data',
						},
					],
				}),
			);
		});

		it('should attach files to both format emails', async () => {
			const binaryData: IBinaryData = {
				data: 'base64data',
				mimeType: 'application/zip',
				fileName: 'archive.zip',
			};

			const items = [
				{
					json: { data: 'test' },
					binary: { data: binaryData },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'both',
				html: '<p>HTML message</p>',
				text: 'Text message',
				options: { appendAttribution: false, attachments: 'data' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn().mockReturnValue(binaryData),
				getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('zip-content')),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					html: '<p>HTML message</p>',
					text: 'Text message',
					attachments: [
						{
							filename: 'archive.zip',
							content: Buffer.from('zip-content'),
							cid: 'data',
						},
					],
				}),
			);
		});
	});

	describe('No Attachments Scenarios', () => {
		it('should send email without attachments when no attachments specified', async () => {
			const items = [
				{
					json: { data: 'test' },
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false },
			});

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					from: 'from@example.com',
					to: 'to@example.com',
					subject: 'Test Subject',
					text: 'Test message',
				}),
			);

			expect(transporter.sendMail).toHaveBeenCalledWith(
				expect.not.objectContaining({
					attachments: expect.anything(),
				}),
			);
		});

		it('should not process attachments when item has no binary data', async () => {
			const items = [
				{
					json: { data: 'test' },
					// No binary property
				},
			];

			mockExecuteFunctions.getInputData.mockReturnValue(items);

			setupMockParameters({
				fromEmail: 'from@example.com',
				toEmail: 'to@example.com',
				subject: 'Test Subject',
				emailFormat: 'text',
				text: 'Test message',
				options: { appendAttribution: false, attachments: 'data' },
			});

			mockExecuteFunctions.helpers = {
				assertBinaryData: jest.fn(),
				getBinaryDataBuffer: jest.fn(),
			} as any;

			transporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

			await emailSendV2.execute.call(mockExecuteFunctions);

			// Should not attempt to process attachments
			expect(mockExecuteFunctions.helpers.assertBinaryData).not.toHaveBeenCalled();
			expect(mockExecuteFunctions.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
		});
	});
});
