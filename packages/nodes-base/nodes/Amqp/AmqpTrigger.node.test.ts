import { testTriggerNode } from '@test/nodes/TriggerHelpers';
import { mockDeep } from 'vitest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { IRun, ITriggerFunctions } from 'n8n-workflow';

import { AmqpTrigger } from './AmqpTrigger.node';

let eventHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockAddCredit = vi.fn();
const mockClose = vi.fn();
const mockOpenReceiver = vi.fn();
const mockEmitExecutionError = vi.fn();

const mockConnection = {
	open_receiver: mockOpenReceiver,
	close: mockClose,
};

vi.mock('rhea', () => ({
	create_container: vi.fn(() => ({
		on: (event: string, handler: (...args: unknown[]) => void) => {
			eventHandlers[event] = handler;
		},
		removeAllListeners: vi.fn((event: string) => {
			delete eventHandlers[event];
		}),
		connect: vi.fn(() => mockConnection),
	})),
}));

describe('AMQP Trigger Node', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		eventHandlers = {};
		mockEmitExecutionError.mockClear();
	});

	it('should throw if no sink provided', async () => {
		await expect(
			testTriggerNode(AmqpTrigger, {
				mode: 'trigger',
				node: { parameters: { sink: '' } },
				credential: { hostname: 'localhost', port: 5672 },
			}),
		).rejects.toThrow(NodeOperationError);
	});

	it('should emit a full message in trigger mode', async () => {
		const { emit, close } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: { parameters: { sink: 'queue://test' } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		eventHandlers['receiver_open']({ receiver: { add_credit: mockAddCredit } });
		expect(mockAddCredit).toHaveBeenCalledWith(100);

		const message = { body: 'hello', message_id: 1 };
		eventHandlers['message']({
			message,
		});

		expect(emit).toHaveBeenCalledWith([[{ json: message }]]);
		await close();
		expect(mockClose).toHaveBeenCalled();
	});

	it('should parse JSON body when jsonParseBody = true', async () => {
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: { parameters: { sink: 'queue://test', options: { jsonParseBody: true } } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		eventHandlers['message']({
			message: { body: '{"foo":"bar"}', message_id: 2 },
		});

		expect(emit).toHaveBeenCalledWith([[{ json: { body: { foo: 'bar' }, message_id: 2 } }]]);
	});

	it('should return only body when onlyBody = true', async () => {
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: { parameters: { sink: 'queue://test', options: { onlyBody: true } } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		eventHandlers['message']({
			message: { body: { nested: true }, message_id: 3 },
		});

		expect(emit).toHaveBeenCalledWith([[{ json: { nested: true } }]]);
	});

	it('should reject in manual mode after 15s with no message', async () => {
		const timeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			fn(); // fire immediately
			return 1 as unknown as NodeJS.Timeout;
		});

		const { manualTriggerFunction } = await testTriggerNode(AmqpTrigger, {
			mode: 'manual',
			node: { parameters: { sink: 'queue://test' } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		await expect(manualTriggerFunction?.()).rejects.toThrow(
			'Aborted because no message was received within 15 seconds',
		);
		timeoutSpy.mockRestore();
	});

	it('should resolve in manual mode when a message arrives', async () => {
		const { manualTriggerFunction, emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'manual',
			node: { parameters: { sink: 'queue://test' } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		const manualTriggerPromise = manualTriggerFunction?.();

		eventHandlers['message']({
			message: { body: '{"foo":"bar"}', message_id: 2 },
		});

		await manualTriggerPromise;

		expect(emit).toHaveBeenCalledWith([[{ json: { body: '{"foo":"bar"}', message_id: 2 } }]]);
	});

	it('should call saveFailedExecution when handleMessage throws an error in trigger mode', async () => {
		const trigger = new AmqpTrigger();
		const emit = vi.fn();
		const saveFailedExecution = vi.fn();

		const triggerFunctions = mockDeep<ITriggerFunctions>();
		Object.assign(triggerFunctions, { emit, saveFailedExecution });
		triggerFunctions.getNode.mockReturnValue({
			id: 'test',
			name: 'Test Node',
			type: 'amqpTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: { sink: 'queue://test', options: { jsonParseBody: true } },
		} as any);
		triggerFunctions.getCredentials.mockResolvedValue({ hostname: 'localhost', port: 5672 } as any);
		triggerFunctions.getMode.mockReturnValue('trigger');
		triggerFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'sink') return 'queue://test';
			if (param === 'options') return { jsonParseBody: true };
			if (param === 'options.parallelProcessing') return true;
			if (param === 'options.jsonParseBody') return true;
			return undefined;
		});
		triggerFunctions.getWorkflowStaticData.mockReturnValue({});

		await trigger.trigger.call(triggerFunctions);

		const addCreditSpy = vi.fn();
		eventHandlers['message']({
			message: { body: 'invalid json {', message_id: 1 },
			receiver: {
				add_credit: addCreditSpy,
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 30));

		expect(saveFailedExecution).toHaveBeenCalledWith(expect.any(NodeOperationError));
		expect(addCreditSpy).toHaveBeenCalledWith(1);
	});

	it('should handle errors in manual mode and reject the promise', async () => {
		const trigger = new AmqpTrigger();
		const emit = vi.fn();

		const triggerFunctions = mockDeep<ITriggerFunctions>();
		Object.assign(triggerFunctions, { emit });
		triggerFunctions.getNode.mockReturnValue({
			id: 'test',
			name: 'Test Node',
			type: 'amqpTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: { sink: 'queue://test', options: { jsonParseBody: true } },
		} as any);
		triggerFunctions.getCredentials.mockResolvedValue({ hostname: 'localhost', port: 5672 } as any);
		triggerFunctions.getMode.mockReturnValue('manual');
		triggerFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'sink') return 'queue://test';
			if (param === 'options') return { jsonParseBody: true };
			if (param === 'options.parallelProcessing') return true;
			if (param === 'options.jsonParseBody') return true;
			return undefined;
		});
		triggerFunctions.getWorkflowStaticData.mockReturnValue({});

		const result = await trigger.trigger.call(triggerFunctions);
		const manualTriggerPromise = result?.manualTriggerFunction?.();

		eventHandlers['message']({
			message: { body: 'invalid json {', message_id: 1 },
		});

		await expect(manualTriggerPromise).rejects.toThrow();
	});

	it('should handle duplicate messages correctly', async () => {
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: { parameters: { sink: 'queue://test' } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		await Promise.resolve(
			eventHandlers['message']({
				message: { body: 'hello', message_id: 1 },
			}),
		);
		expect(emit).toHaveBeenCalledTimes(1);

		await Promise.resolve(
			eventHandlers['message']({
				message: { body: 'hello', message_id: 1 },
			}),
		);

		expect(emit).toHaveBeenCalledTimes(1);
	});

	it('should handle messages with jsonConvertByteArrayToString option', async () => {
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { jsonConvertByteArrayToString: true },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		const message = {
			body: {
				content: {
					data: [72, 101, 108, 108, 111],
				},
			},
			message_id: 1,
		};

		eventHandlers['message']({
			message,
		});

		expect(emit).toHaveBeenCalled();
	});

	it('should handle parallel processing correctly', async () => {
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { parallelProcessing: false },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		const message = { body: 'hello', message_id: 1 };
		eventHandlers['message']({
			message,
			receiver: {
				add_credit: vi.fn(),
			},
		});

		expect(emit).toHaveBeenCalled();
	});

	it('should release 1 credit after a message completes', async () => {
		const addCreditSpy = vi.fn();
		await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { sleepTime: 5 },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		vi.useFakeTimers();
		await Promise.resolve(
			eventHandlers['message']({
				message: { body: 'hello', message_id: 1 },
				receiver: { add_credit: addCreditSpy },
			}),
		);

		vi.advanceTimersByTime(10);
		vi.useRealTimers();

		expect(addCreditSpy).toHaveBeenCalledTimes(1);
		expect(addCreditSpy).toHaveBeenCalledWith(1);
	});

	it('should release 1 credit per completed message when multiple are in flight', async () => {
		const addCreditSpy = vi.fn();
		await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { pullMessagesNumber: 3 },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		vi.useFakeTimers();
		const receiver = { add_credit: addCreditSpy };
		await Promise.all(
			[1, 2, 3].map(async (id) => {
				await Promise.resolve(
					eventHandlers['message']({ message: { body: 'hello', message_id: id }, receiver }),
				);
			}),
		);

		vi.advanceTimersByTime(15);
		vi.useRealTimers();

		const totalCreditsGranted = addCreditSpy.mock.calls.reduce(
			(sum: number, [credits]) => sum + (credits as number),
			0,
		);
		expect(totalCreditsGranted).toBe(3);
	});

	it('should not release credit before the execution finishes when parallelProcessing is false', async () => {
		const addCreditSpy = vi.fn();
		const { emit } = await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { parallelProcessing: false },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		vi.useFakeTimers();
		const handlerPromise = eventHandlers['message']({
			message: { body: 'hello', message_id: 1 },
			receiver: { add_credit: addCreditSpy },
		});

		await vi.advanceTimersByTimeAsync(100);
		expect(addCreditSpy).not.toHaveBeenCalled();

		emit.mock.calls[0][2]?.resolve({} as IRun);
		await Promise.resolve(handlerPromise);

		await vi.advanceTimersByTimeAsync(15);
		vi.useRealTimers();
		expect(addCreditSpy).toHaveBeenCalledWith(1);
	});

	it('should grant only the free slots when the receiver reopens after a reconnect', async () => {
		const addCreditSpy = vi.fn();
		await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { pullMessagesNumber: 3, sleepTime: 5 },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		const receiver = { add_credit: addCreditSpy };
		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenLastCalledWith(3);

		vi.useFakeTimers();
		await Promise.resolve(
			eventHandlers['message']({ message: { body: 'a', message_id: 1 }, receiver }),
		);
		await Promise.resolve(
			eventHandlers['message']({ message: { body: 'b', message_id: 2 }, receiver }),
		);

		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenLastCalledWith(1);

		vi.advanceTimersByTime(10);
		vi.useRealTimers();

		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenLastCalledWith(3);
	});

	it('should not release credit for executions that finish while the link is down', async () => {
		const addCreditSpy = vi.fn();
		await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { pullMessagesNumber: 3, sleepTime: 5 },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		const receiver = { add_credit: addCreditSpy };
		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenLastCalledWith(3);

		vi.useFakeTimers();
		await Promise.resolve(
			eventHandlers['message']({ message: { body: 'a', message_id: 1 }, receiver }),
		);
		await Promise.resolve(
			eventHandlers['message']({ message: { body: 'b', message_id: 2 }, receiver }),
		);

		eventHandlers['disconnected']({});
		addCreditSpy.mockClear();

		// both executions finish while disconnected: slots are freed but no credit is added
		vi.advanceTimersByTime(10);
		vi.useRealTimers();
		expect(addCreditSpy).not.toHaveBeenCalled();

		// the reopened receiver grants all free slots, restoring the full window
		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenCalledTimes(1);
		expect(addCreditSpy).toHaveBeenLastCalledWith(3);
	});

	it('should resume releasing credit per completion after the receiver reopens', async () => {
		const addCreditSpy = vi.fn();
		await testTriggerNode(AmqpTrigger, {
			mode: 'trigger',
			node: {
				parameters: {
					sink: 'queue://test',
					options: { pullMessagesNumber: 3, sleepTime: 5 },
				},
			},
			credential: { hostname: 'localhost', port: 5672 },
		});

		const receiver = { add_credit: addCreditSpy };
		eventHandlers['disconnected']({});
		eventHandlers['receiver_open']({ receiver });
		expect(addCreditSpy).toHaveBeenLastCalledWith(3);

		vi.useFakeTimers();
		await Promise.resolve(
			eventHandlers['message']({ message: { body: 'a', message_id: 1 }, receiver }),
		);
		addCreditSpy.mockClear();

		vi.advanceTimersByTime(10);
		vi.useRealTimers();
		expect(addCreditSpy).toHaveBeenCalledWith(1);
	});
});
