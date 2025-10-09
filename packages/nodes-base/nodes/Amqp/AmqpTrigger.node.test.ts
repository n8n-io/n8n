import { NodeOperationError } from 'n8n-workflow';

import { testTriggerNode } from '@test/nodes/TriggerHelpers';

import { AmqpTrigger } from './AmqpTrigger.node';

let eventHandlers: Record<string, (...args: unknown[]) => void> = {};
const mockAddCredit = jest.fn();
const mockClose = jest.fn();
const mockOpenReceiver = jest.fn();

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
});
