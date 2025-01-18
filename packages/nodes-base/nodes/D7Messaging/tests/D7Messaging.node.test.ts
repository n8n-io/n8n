import type { IExecuteFunctions } from 'n8n-workflow';

import { D7Messaging } from '../D7Messaging.node';

interface MockParameters {
	channel?: string;
	content?: string;
	recipients?: string;
	messageType?: string;
	originator?: string;
	messageBody?: string;
	previewUrl?: boolean;
	templateId?: string;
	language?: string;
	bodyParameters?: {
		parameters: Array<{ key: string; value: string }>;
	};
	mediaUrl?: string;
	mediaType?: string;
	mediaCaption?: string;
}

describe('D7Messaging', () => {
	let node: D7Messaging;
	let mockExecuteFunction: IExecuteFunctions;

	beforeEach(() => {
		node = new D7Messaging();

		mockExecuteFunction = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			helpers: {
				request: jest.fn(),
			},
		} as unknown as IExecuteFunctions;

		(mockExecuteFunction.getCredentials as jest.Mock).mockResolvedValue({
			apiKey: 'test-api-key',
		});

		(mockExecuteFunction.helpers.request as jest.Mock).mockResolvedValue({
			status: 'success',
			message_id: 'test-message-id',
		});
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(node.description.name).toBe('d7Messaging');
			expect(node.description.displayName).toBe('D7 Messaging');
			expect(node.description.icon).toBe('file:d7.svg');
			expect(node.description.group).toEqual(['transform']);
			expect(node.description.version).toBe(1);
		});

		it('should have required credentials', () => {
			expect(node.description.credentials).toEqual([
				{
					name: 'd7Api',
					required: true,
				},
			]);
		});
	});

	describe('SMS Messaging', () => {
		beforeEach(() => {
			const mockParams: MockParameters = {
				channel: 'sms',
				content: 'Test SMS message',
				recipients: '+1234567890,+0987654321',
			};

			(mockExecuteFunction.getNodeParameter as jest.Mock).mockImplementation(
				(parameterName: string, _: number) => mockParams[parameterName as keyof MockParameters],
			);
		});

		it('should send SMS message successfully', async () => {
			await node.execute.call(mockExecuteFunction);

			expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
				'https://api.d7networks.com/messages/v1/send',
				{
					method: 'POST',
					body: JSON.stringify({
						messages: [
							{
								channel: 'sms',
								recipients: ['+1234567890', '+0987654321'],
								content: 'Test SMS message',
								msg_type: 'text',
								data_coding: 'text',
							},
						],
						message_globals: {
							originator: 'SignOTP',
						},
					}),
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-api-key',
					},
				},
			);
		});
	});

	describe('WhatsApp Messaging', () => {
		describe('Text Messages', () => {
			beforeEach(() => {
				const mockParams: MockParameters = {
					channel: 'whatsapp',
					messageType: 'serviceText',
					originator: 'test-originator',
					messageBody: 'Test WhatsApp message',
					previewUrl: true,
					recipients: '+1234567890,+0987654321',
				};

				(mockExecuteFunction.getNodeParameter as jest.Mock).mockImplementation(
					(parameterName: string, _: number) => mockParams[parameterName as keyof MockParameters],
				);
			});

			it('should send WhatsApp text message successfully', async () => {
				await node.execute.call(mockExecuteFunction);

				expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
					'https://api.d7networks.com/whatsapp/v2/send',
					{
						method: 'POST',
						body: JSON.stringify({
							messages: [
								{
									originator: 'test-originator',
									content: {
										message_type: 'TEXT',
										text: {
											preview_url: true,
											body: 'Test WhatsApp message',
										},
									},
									recipients: [
										{ recipient: '+1234567890', recipient_type: 'individual' },
										{ recipient: '+0987654321', recipient_type: 'individual' },
									],
								},
							],
						}),
						headers: {
							'Content-Type': 'application/json',
							Authorization: 'Bearer test-api-key',
						},
					},
				);
			});
		});

		describe('Template Messages', () => {
			beforeEach(() => {
				const mockParams: MockParameters = {
					channel: 'whatsapp',
					messageType: 'utilityText',
					originator: 'test-originator',
					templateId: 'test-template',
					language: 'en',
					recipients: '+1234567890',
					bodyParameters: {
						parameters: [
							{ key: 'param1', value: 'value1' },
							{ key: 'param2', value: 'value2' },
						],
					},
				};

				(mockExecuteFunction.getNodeParameter as jest.Mock).mockImplementation(
					(parameterName: string, _: number) => mockParams[parameterName as keyof MockParameters],
				);
			});

			it('should send WhatsApp template message successfully', async () => {
				await node.execute.call(mockExecuteFunction);

				expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
					'https://api.d7networks.com/whatsapp/v2/send',
					{
						method: 'POST',
						body: JSON.stringify({
							messages: [
								{
									originator: 'test-originator',
									content: {
										message_type: 'TEMPLATE',
										template: {
											template_id: 'test-template',
											language: 'en',
											body_parameter_values: {
												param1: 'value1',
												param2: 'value2',
											},
										},
									},
									recipients: [{ recipient: '+1234567890', recipient_type: 'individual' }],
								},
							],
						}),
						headers: {
							'Content-Type': 'application/json',
							Authorization: 'Bearer test-api-key',
						},
					},
				);
			});
		});

		describe('Media Messages', () => {
			beforeEach(() => {
				const mockParams: MockParameters = {
					channel: 'whatsapp',
					messageType: 'serviceMedia',
					originator: 'test-originator',
					mediaUrl: 'https://example.com/media.jpg',
					mediaType: 'image',
					mediaCaption: 'Test media caption',
					recipients: '+1234567890',
				};

				(mockExecuteFunction.getNodeParameter as jest.Mock).mockImplementation(
					(parameterName: string, _: number) => mockParams[parameterName as keyof MockParameters],
				);
			});

			it('should send WhatsApp media message successfully', async () => {
				await node.execute.call(mockExecuteFunction);

				expect(mockExecuteFunction.helpers.request).toHaveBeenCalledWith(
					'https://api.d7networks.com/whatsapp/v2/send',
					{
						method: 'POST',
						body: JSON.stringify({
							messages: [
								{
									originator: 'test-originator',
									content: {
										message_type: 'ATTACHMENT',
										attachment: {
											type: 'image',
											url: 'https://example.com/media.jpg',
											caption: 'Test media caption',
										},
									},
									recipients: [{ recipient: '+1234567890', recipient_type: 'individual' }],
								},
							],
						}),
						headers: {
							'Content-Type': 'application/json',
							Authorization: 'Bearer test-api-key',
						},
					},
				);
			});
		});
	});

	describe('Error Handling', () => {
		beforeEach(() => {
			const mockParams: MockParameters = {
				channel: 'sms',
				content: 'Test message',
				recipients: '+1234567890',
			};

			(mockExecuteFunction.getNodeParameter as jest.Mock).mockImplementation(
				(parameterName: string, _: number) => mockParams[parameterName as keyof MockParameters],
			);

			(mockExecuteFunction.helpers.request as jest.Mock).mockRejectedValue(new Error('API Error'));
		});

		it('should handle API errors appropriately', async () => {
			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow('API Error');
		});
	});
});
