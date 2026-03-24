import { mockDeep } from 'jest-mock-extended';
import type { ITriggerFunctions, IDeferredPromise, IRun } from 'n8n-workflow';
import type { EventContext } from 'rhea';

import { handleMessage } from './handleMessage';

interface MockReceiver {
	has_credit: jest.Mock<boolean>;
	add_credit: jest.Mock;
}

describe('handleMessage', () => {
	let mockTriggerFunctions: jest.Mocked<ITriggerFunctions>;
	let mockContext: EventContext;
	let mockReceiver: MockReceiver;
	let mockDeferredPromise: jest.Mocked<IDeferredPromise<IRun>>;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		mockDeferredPromise = {
			promise: Promise.resolve({} as IRun),
			resolve: jest.fn(),
			reject: jest.fn(),
		} as jest.Mocked<IDeferredPromise<IRun>>;

		mockReceiver = {
			has_credit: jest.fn<boolean, []>().mockReturnValue(true),
			add_credit: jest.fn(),
		};

		mockContext = {
			message: {
				body: 'test message',
				message_id: 1,
			},
			receiver: mockReceiver as unknown as EventContext['receiver'],
		} as EventContext;

		mockTriggerFunctions = mockDeep<ITriggerFunctions>({
			helpers: {
				createDeferredPromise: jest.fn().mockReturnValue(mockDeferredPromise),
				returnJsonArray: jest.fn((data) => data),
			},
			emit: jest.fn(),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('message handling', () => {
		it('should return null when context has no message', async () => {
			mockContext.message = null as unknown as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toBeNull();
			expect(mockTriggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('should return null for duplicate messages', async () => {
			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: 1,
				pullMessagesNumber: 100,
			});

			expect(result).toBeNull();
			expect(mockTriggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('should emit message data correctly', async () => {
			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: 1 });
			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[[mockContext.message]],
				undefined,
				expect.anything(),
			);
		});

		it('should return messageId from processed message', async () => {
			mockContext.message = {
				body: 'test',
				message_id: 'test-id-123',
			} as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: 'test-id-123' });
		});
	});

	describe('jsonParseBody option', () => {
		it('should parse JSON body when jsonParseBody is true', async () => {
			mockContext.message = {
				body: '{"foo":"bar","number":123}',
				message_id: 2,
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				jsonParseBody: true,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[
					[
						{
							body: { foo: 'bar', number: 123 },
							message_id: 2,
						},
					],
				],
				undefined,
				expect.anything(),
			);
		});

		it('should not parse JSON body when jsonParseBody is false', async () => {
			mockContext.message = {
				body: '{"foo":"bar"}',
				message_id: 3,
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				jsonParseBody: false,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[
					[
						{
							body: '{"foo":"bar"}',
							message_id: 3,
						},
					],
				],
				undefined,
				expect.anything(),
			);
		});
	});

	describe('onlyBody option', () => {
		it('should return only body when onlyBody is true', async () => {
			mockContext.message = {
				body: { nested: { data: 'value' } },
				message_id: 4,
				otherProperty: 'should be ignored',
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				onlyBody: true,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[[{ nested: { data: 'value' } }]],
				undefined,
				expect.anything(),
			);
		});

		it('should return full message when onlyBody is false', async () => {
			mockContext.message = {
				body: { nested: { data: 'value' } },
				message_id: 5,
				otherProperty: 'should be included',
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				onlyBody: false,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[[mockContext.message]],
				undefined,
				expect.anything(),
			);
		});
	});

	describe('jsonConvertByteArrayToString option', () => {
		it('should convert byte array to string when jsonConvertByteArrayToString is true', async () => {
			mockContext.message = {
				body: {
					content: {
						data: [72, 101, 108, 108, 111],
					},
				},
				message_id: 6,
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				jsonConvertByteArrayToString: true,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalled();
			const callArgs = mockTriggerFunctions.emit.mock.calls[0][0];
			expect(callArgs[0][0].body).toBe('Hello');
		});

		it('should not convert when jsonConvertByteArrayToString is false', async () => {
			mockContext.message = {
				body: {
					content: {
						data: [72, 101, 108, 108, 111],
					},
				},
				message_id: 7,
			} as EventContext['message'];

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				jsonConvertByteArrayToString: false,
			});

			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[[mockContext.message]],
				undefined,
				expect.anything(),
			);
		});
	});

	describe('parallelProcessing option', () => {
		it('should create deferred promise when parallelProcessing is false', async () => {
			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				parallelProcessing: false,
			});

			expect(mockTriggerFunctions.helpers.createDeferredPromise).toHaveBeenCalled();
			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith(
				[[mockContext.message]],
				undefined,
				mockDeferredPromise,
			);
		});

		it('should not create deferred promise when parallelProcessing is true', async () => {
			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				parallelProcessing: true,
			});

			expect(mockTriggerFunctions.helpers.createDeferredPromise).not.toHaveBeenCalled();
			expect(mockTriggerFunctions.emit).toHaveBeenCalledWith([[mockContext.message]]);
		});

		it('should await promise when parallelProcessing is false', async () => {
			let promiseResolved = false;
			mockDeferredPromise.promise = new Promise<IRun>((resolve) => {
				setTimeout(() => {
					promiseResolved = true;
					resolve({} as IRun);
				}, 100);
			});

			const handlePromise = handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				parallelProcessing: false,
			});

			jest.advanceTimersByTime(100);
			await handlePromise;

			expect(promiseResolved).toBe(true);
		});
	});

	describe('receiver credit management', () => {
		it('should add credit when receiver has no credit', async () => {
			mockReceiver.has_credit.mockReturnValue(false);

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 50,
				sleepTime: 20,
			});

			jest.advanceTimersByTime(25);

			expect(mockReceiver.add_credit).toHaveBeenCalledWith(50);
		});

		it('should not add credit when receiver has credit', async () => {
			mockReceiver.has_credit.mockReturnValue(true);

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			jest.advanceTimersByTime(20);

			expect(mockReceiver.add_credit).not.toHaveBeenCalled();
		});

		it('should use default sleepTime of 10ms when not provided', async () => {
			mockReceiver.has_credit.mockReturnValue(false);

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			jest.advanceTimersByTime(15);

			expect(mockReceiver.add_credit).toHaveBeenCalledWith(100);
		});

		it('should use custom sleepTime when provided', async () => {
			mockReceiver.has_credit.mockReturnValue(false);

			await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
				sleepTime: 50,
			});

			jest.advanceTimersByTime(30);
			expect(mockReceiver.add_credit).not.toHaveBeenCalled();

			jest.advanceTimersByTime(25);
			expect(mockReceiver.add_credit).toHaveBeenCalledWith(100);
		});

		it('should handle missing receiver gracefully', async () => {
			mockContext.receiver = undefined;

			await expect(
				handleMessage.call(mockTriggerFunctions, mockContext, {
					lastMessageId: undefined,
					pullMessagesNumber: 100,
				}),
			).resolves.toEqual({ messageId: 1 });
		});
	});

	describe('edge cases', () => {
		it('should handle message with undefined message_id', async () => {
			mockContext.message = {
				body: 'test',
				message_id: undefined,
			} as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: undefined });
			expect(mockTriggerFunctions.emit).toHaveBeenCalled();
		});

		it('should handle message with Buffer message_id', async () => {
			const bufferId = Buffer.from('test-id');
			mockContext.message = {
				body: 'test',
				message_id: bufferId,
			} as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: bufferId });
		});

		it('should handle message with string message_id', async () => {
			mockContext.message = {
				body: 'test',
				message_id: 'string-id-123',
			} as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: 'string-id-123' });
		});

		it('should handle message with number message_id', async () => {
			mockContext.message = {
				body: 'test',
				message_id: 999,
			} as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
				pullMessagesNumber: 100,
			});

			expect(result).toEqual({ messageId: 999 });
		});
	});
});
