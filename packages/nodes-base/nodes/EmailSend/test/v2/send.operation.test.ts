import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IExecuteFunctions } from 'n8n-workflow';

import { EmailSendV2, versionDescription } from '../../v2/EmailSendV2.node';
import * as utils from '../../v2/utils';

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
	});
});
