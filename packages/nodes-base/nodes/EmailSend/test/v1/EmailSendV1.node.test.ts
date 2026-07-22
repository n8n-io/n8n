import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { EmailSendV1 } from '../../v1/EmailSendV1.node';

const mockTransporter = { sendMail: jest.fn() };

jest.mock('nodemailer', () => ({
	createTransport: jest.fn(() => mockTransporter),
}));

describe('Test EmailSendV1', () => {
	let emailSendV1: EmailSendV1;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

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
		} as unknown as INodeTypeBaseDescription);

		mockExecuteFunctions = mock<IExecuteFunctions>();
		jest.clearAllMocks();
	});

	it('should serialize object message values before sending', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { data: 'test' } }]);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			host: 'smtp.example.com',
			port: 587,
			secure: false,
		});
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('from@example.com')
			.mockReturnValueOnce('to@example.com')
			.mockReturnValueOnce('cc@example.com')
			.mockReturnValueOnce('bcc@example.com')
			.mockReturnValueOnce('Test Subject')
			.mockReturnValueOnce({ path: 'message.txt' })
			.mockReturnValueOnce({ href: 'https://example.test/message' })
			.mockReturnValueOnce('')
			.mockReturnValueOnce({ replyTo: 'reply@example.com' });
		mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

		await emailSendV1.execute.call(mockExecuteFunctions);

		expect(mockTransporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'from@example.com',
				to: 'to@example.com',
				cc: 'cc@example.com',
				bcc: 'bcc@example.com',
				subject: 'Test Subject',
				text: '{"path":"message.txt"}',
				html: '{"href":"https://example.test/message"}',
				replyTo: 'reply@example.com',
				disableFileAccess: true,
				disableUrlAccess: true,
			}),
		);
	});
});
