import type { IExecuteFunctions } from 'n8n-workflow';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import * as sendOperation from '../../v2/send.operation';

const mockTransporter = { sendMail: jest.fn() };

jest.mock('../../v2/utils', () => {
	const originalModule = jest.requireActual('../../v2/utils');
	return {
		...originalModule,
		configureTransport: jest.fn(() => mockTransporter),
	};
});

describe('Test EmailSendV2, send operation', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		jest.clearAllMocks();
	});

	it('should request normalized text and HTML values before sending', async () => {
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { data: 'test' } }]);
		mockExecuteFunctions.getNode.mockReturnValue({
			typeVersion: 2.1,
		} as ReturnType<IExecuteFunctions['getNode']>);
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			host: 'smtp.example.com',
			port: 587,
		});
		mockExecuteFunctions.getNodeParameter
			.mockReturnValueOnce('from@example.com')
			.mockReturnValueOnce('to@example.com')
			.mockReturnValueOnce('Test Subject')
			.mockReturnValueOnce('both')
			.mockReturnValueOnce({
				appendAttribution: false,
				ccEmail: 'cc@example.com',
				bccEmail: 'bcc@example.com',
				replyTo: 'reply@example.com',
			})
			.mockReturnValueOnce(['plain text'])
			.mockReturnValueOnce(['rich text']);
		mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

		await sendOperation.execute.call(mockExecuteFunctions);

		expect(mockTransporter.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({
				from: 'from@example.com',
				to: 'to@example.com',
				cc: 'cc@example.com',
				bcc: 'bcc@example.com',
				subject: 'Test Subject',
				text: '["plain text"]',
				html: '["rich text"]',
				replyTo: 'reply@example.com',
			}),
		);
	});
});
