import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { BrowserNotification } from './BrowserNotification.node';

describe('BrowserNotification Node', () => {
	const executeFunctions = mock<IExecuteFunctions>({
		getNode: jest.fn().mockReturnValue({ name: 'Browser Notification Test Node' }),
	});

	beforeEach(() => {
		jest.clearAllMocks();
		executeFunctions.getInputData.mockReturnValue([{ json: { test: true } }]);
	});

	describe('execute', () => {
		it('should set metadata with title only', async () => {
			executeFunctions.getNodeParameter.calledWith('title', 0).mockReturnValue('Test Title');
			executeFunctions.getNodeParameter.calledWith('message', 0).mockReturnValue('');
			executeFunctions.getNodeParameter.calledWith('iconUrl', 0).mockReturnValue('');

			const result = await new BrowserNotification().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'notification',
					notification: {
						title: 'Test Title',
						body: undefined,
						icon: undefined,
					},
				},
			});
			expect(result[0][0].json).toMatchObject({
				notification: {
					title: 'Test Title',
					message: null,
					iconUrl: null,
					status: 'sent',
				},
			});
		});

		it('should set metadata with title and message', async () => {
			executeFunctions.getNodeParameter.calledWith('title', 0).mockReturnValue('Test Title');
			executeFunctions.getNodeParameter
				.calledWith('message', 0)
				.mockReturnValue('Test message body');
			executeFunctions.getNodeParameter.calledWith('iconUrl', 0).mockReturnValue('');

			const result = await new BrowserNotification().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'notification',
					notification: {
						title: 'Test Title',
						body: 'Test message body',
						icon: undefined,
					},
				},
			});
			expect(result[0][0].json).toMatchObject({
				notification: {
					title: 'Test Title',
					message: 'Test message body',
					iconUrl: null,
					status: 'sent',
				},
			});
		});

		it('should set metadata with all fields', async () => {
			executeFunctions.getNodeParameter.calledWith('title', 0).mockReturnValue('Full Notification');
			executeFunctions.getNodeParameter
				.calledWith('message', 0)
				.mockReturnValue('Complete message');
			executeFunctions.getNodeParameter
				.calledWith('iconUrl', 0)
				.mockReturnValue('https://example.com/icon.png');

			const result = await new BrowserNotification().execute.call(executeFunctions);

			expect(executeFunctions.setMetadata).toHaveBeenCalledWith({
				browserApi: {
					type: 'notification',
					notification: {
						title: 'Full Notification',
						body: 'Complete message',
						icon: 'https://example.com/icon.png',
					},
				},
			});
			expect(result[0][0].json).toMatchObject({
				notification: {
					title: 'Full Notification',
					message: 'Complete message',
					iconUrl: 'https://example.com/icon.png',
					status: 'sent',
				},
			});
		});

		it('should handle multiple input items', async () => {
			executeFunctions.getInputData.mockReturnValue([{ json: { item: 1 } }, { json: { item: 2 } }]);
			executeFunctions.getNodeParameter.calledWith('title', 0).mockReturnValue('Test');
			executeFunctions.getNodeParameter.calledWith('message', 0).mockReturnValue('');
			executeFunctions.getNodeParameter.calledWith('iconUrl', 0).mockReturnValue('');

			const result = await new BrowserNotification().execute.call(executeFunctions);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json).toMatchObject({ item: 1, notification: expect.any(Object) });
			expect(result[0][1].json).toMatchObject({ item: 2, notification: expect.any(Object) });
		});

		it('should preserve original item data', async () => {
			executeFunctions.getInputData.mockReturnValue([
				{ json: { existingField: 'value', nested: { data: 123 } } },
			]);
			executeFunctions.getNodeParameter.calledWith('title', 0).mockReturnValue('Test');
			executeFunctions.getNodeParameter.calledWith('message', 0).mockReturnValue('');
			executeFunctions.getNodeParameter.calledWith('iconUrl', 0).mockReturnValue('');

			const result = await new BrowserNotification().execute.call(executeFunctions);

			expect(result[0][0].json).toMatchObject({
				existingField: 'value',
				nested: { data: 123 },
				notification: expect.any(Object),
			});
		});
	});
});
