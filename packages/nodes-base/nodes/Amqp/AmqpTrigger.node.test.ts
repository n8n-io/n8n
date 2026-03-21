import { testTriggerNode } from '@test/nodes/TriggerHelpers';
import { mockDeep } from 'jest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { ITriggerFunctions } from 'n8n-workflow';

import { AmqpTrigger } from './AmqpTrigger.node';

let eventHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockAddCredit = jest.fn();
const mockClose = jest.fn();
const mockOpenReceiver = jest.fn();
const mockEmitExecutionError = jest.fn();

const mockConnection = {
	open_receiver: mockOpenReceiver,
	close: mockClose,
};

jest.mock('rhea', () => ({
	create_container: jest.fn(() => ({
		on: (event: string, handler: (...args: unknown[]) => void) => {
			eventHandlers[event] = handler;
		},
		removeAllListeners: jest.fn((event: string) => {
			delete eventHandlers[event];
		}),
		connect: jest.fn(() => mockConnection),
	})),
}));

describe('AMQP Trigger Node', () => {
	beforeEach(() => {
		jest.clearAllMocks();
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
		const timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			fn(); // fire immediately
			return 1 as unknown as NodeJS.Timeout;
		});

		const { manualTriggerFunction } = await testTriggerNode(AmqpTrigger, {
			mode: 'manual',
			node: { parameters: { sink: 'queue://test' } },
			credential: { hostname: 'localhost', port: 5672 },
		});

		await expect(manualTriggerFunction?.()).rejects.toThrow(
			'Aborted because no message received within 15 seconds',
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
		const emit = jest.fn();
		const saveFailedExecution = jest.fn();

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

		eventHandlers['message']({
			message: { body: 'invalid json {', message_id: 1 },
			receiver: {
				has_credit: jest.fn().mockReturnValue(true),
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(saveFailedExecution).toHaveBeenCalledWith(expect.any(NodeOperationError));
	});

	it('should handle errors in manual mode and reject the promise', async () => {
		const trigger = new AmqpTrigger();
		const emit = jest.fn();

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
				has_credit: jest.fn().mockReturnValue(true),
			},
		});

		expect(emit).toHaveBeenCalled();
	});

	it('should add credit when receiver has no credit', async () => {
		const addCreditSpy = jest.fn();
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

		jest.useFakeTimers();
		const message = { body: 'hello', message_id: 1 };
		eventHandlers['message']({
			message,
			receiver: {
				has_credit: jest.fn().mockReturnValue(false),
				add_credit: addCreditSpy,
			},
		});

		jest.advanceTimersByTime(10);
		jest.useRealTimers();

		expect(addCreditSpy).toHaveBeenCalledWith(100);
	});
});
