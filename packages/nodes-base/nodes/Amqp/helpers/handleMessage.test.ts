import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ITriggerFunctions, IRun } from 'n8n-workflow';
import type { EventContext } from 'rhea';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { handleMessage } from './handleMessage';

describe('handleMessage', () => {
	let mockTriggerFunctions: Mocked<ITriggerFunctions>;
	let mockContext: EventContext;
	let mockDeferredPromise: Mocked<IDeferredPromise<IRun>>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockDeferredPromise = {
			promise: Promise.resolve({} as IRun),
			resolve: vi.fn(),
			reject: vi.fn(),
		} as Mocked<IDeferredPromise<IRun>>;

		mockContext = {
			message: {
				body: 'test message',
				message_id: 1,
			},
		} as EventContext;

		mockTriggerFunctions = mockDeep<ITriggerFunctions>({
			helpers: {
				createDeferredPromise: vi.fn().mockReturnValue(mockDeferredPromise),
				returnJsonArray: vi.fn((data) => data),
			},
			emit: vi.fn(),
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('message handling', () => {
		it('should return null when context has no message', async () => {
			mockContext.message = null as unknown as EventContext['message'];

			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
			});

			expect(result).toBeNull();
			expect(mockTriggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('should return null for duplicate messages', async () => {
			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: 1,
			});

			expect(result).toBeNull();
			expect(mockTriggerFunctions.emit).not.toHaveBeenCalled();
		});

		it('should emit message data correctly', async () => {
			const result = await handleMessage.call(mockTriggerFunctions, mockContext, {
				lastMessageId: undefined,
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
				parallelProcessing: false,
			});

			vi.advanceTimersByTime(100);
			await handlePromise;

			expect(promiseResolved).toBe(true);
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
			});

			expect(result).toEqual({ messageId: 999 });
		});
	});
});
