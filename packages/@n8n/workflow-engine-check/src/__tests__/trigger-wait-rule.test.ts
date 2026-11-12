import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';

import { checkEngineV2Eligibility } from '../index';

const nodeTypes: INodeTypeDescription[] = [];

function trigger(type: string, typeVersion: number, parameters: INodeParameters = {}): INode {
	return {
		id: 'trigger-id',
		name: 'Trigger',
		type: `n8n-nodes-base.${type}`,
		typeVersion,
		position: [0, 0],
		parameters,
	};
}

function check(node: INode) {
	return checkEngineV2Eligibility({ nodes: [node], connections: {}, settings: {} }, nodeTypes);
}

describe('trigger wait rule', () => {
	// Engine v2 refuses a trigger that waits for its run. Each row sets the
	// settings that make the trigger wait, as the trigger's own code reads them.
	it.each<[string, INode]>([
		['a default Kafka trigger v1.1', trigger('kafkaTrigger', 1.1)],
		[
			'a Kafka trigger v1.1 without parallel processing',
			trigger('kafkaTrigger', 1.1, { options: { parallelProcessing: false } }),
		],
		['a default Kafka trigger v1.3', trigger('kafkaTrigger', 1.3)],
		['a default Kafka trigger v2', trigger('kafkaTrigger', 2)],
		[
			'a Kafka trigger v2 that resolves the offset on success',
			trigger('kafkaTrigger', 2, { resolveOffset: 'onSuccess' }),
		],
		[
			'a RabbitMQ trigger that deletes the message when the execution finishes',
			trigger('rabbitmqTrigger', 1, { options: { acknowledge: 'executionFinishes' } }),
		],
		[
			'a RabbitMQ trigger with a parallel message limit',
			trigger('rabbitmqTrigger', 1, { options: { parallelMessages: 5 } }),
		],
		[
			'an AMQP trigger without parallel processing',
			trigger('amqpTrigger', 1, { options: { parallelProcessing: false } }),
		],
		['a default MQTT trigger', trigger('mqttTrigger', 1)],
		[
			'an MQTT trigger without parallel processing',
			trigger('mqttTrigger', 1, { options: { parallelProcessing: false } }),
		],
	])('blocks %s', (_, node) => {
		expect(check(node)).toEqual({
			eligible: false,
			reasons: [
				{
					code: 'TRIGGER_WAITS_FOR_RUN',
					severity: 'blocking',
					nodeId: 'trigger-id',
					nodeName: 'Trigger',
					message: expect.stringContaining('"Trigger"'),
				},
			],
		});
	});

	it.each<[string, INode]>([
		['a Kafka trigger v1', trigger('kafkaTrigger', 1)],
		[
			'a Kafka trigger v1.1 with parallel processing',
			trigger('kafkaTrigger', 1.1, { options: { parallelProcessing: true } }),
		],
		// v1.2 hides Resolve Offset, so the trigger falls back to resolving immediately.
		['a Kafka trigger v1.2', trigger('kafkaTrigger', 1.2, { resolveOffset: 'onCompletion' })],
		[
			'a Kafka trigger v2 that resolves the offset immediately',
			trigger('kafkaTrigger', 2, { resolveOffset: 'immediately' }),
		],
		['a default RabbitMQ trigger', trigger('rabbitmqTrigger', 1)],
		[
			'a RabbitMQ trigger that deletes the message immediately',
			trigger('rabbitmqTrigger', 1, { options: { acknowledge: 'immediately' } }),
		],
		// The editor hides the limit in this mode. Not blocking is the safe side if it stays stored.
		[
			'a RabbitMQ trigger that deletes the message immediately, with a parallel message limit',
			trigger('rabbitmqTrigger', 1, {
				options: { acknowledge: 'immediately', parallelMessages: 5 },
			}),
		],
		[
			'a RabbitMQ trigger without a parallel message limit',
			trigger('rabbitmqTrigger', 1, { options: { parallelMessages: -1 } }),
		],
		['a default AMQP trigger', trigger('amqpTrigger', 1)],
		[
			'an MQTT trigger with parallel processing',
			trigger('mqttTrigger', 1, { options: { parallelProcessing: true } }),
		],
		['an IMAP trigger', trigger('emailReadImap', 2.1)],
		['a disabled trigger that waits', { ...trigger('mqttTrigger', 1), disabled: true }],
	])('allows %s', (_, node) => {
		expect(check(node)).toEqual({ eligible: true, reasons: [] });
	});

	it.each<[string, INode]>([
		[
			'Resolve Offset is an expression',
			trigger('kafkaTrigger', 2, { resolveOffset: '={{ "onSuccess" }}' }),
		],
		[
			'Parallel Processing is an expression',
			trigger('mqttTrigger', 1, { options: { parallelProcessing: '={{ false }}' } }),
		],
		[
			'Delete From Queue When is an expression',
			trigger('rabbitmqTrigger', 1, { options: { acknowledge: '={{ "executionFinishes" }}' } }),
		],
		['the options are an expression', trigger('amqpTrigger', 1, { options: '={{ {} }}' })],
	])('warns but stays eligible when %s', (_, node) => {
		expect(check(node)).toEqual({
			eligible: true,
			reasons: [expect.objectContaining({ code: 'TRIGGER_WAITS_FOR_RUN', severity: 'warning' })],
		});
	});
});
