import { IHeaders, Kafka } from 'kafkajs';

import { IExecuteSingleFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class ApacheKafka implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Apache Kafka',
		name: 'kafka',
		icon: 'file:kafka.svg',
		group: ['transform'],
		version: 1,
		description: 'Sends a message to a Kafka topic, executed once per item',
		defaults: {
			name: 'Apache Kafka',
			color: '#000000',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{
			name: 'kafka',
			required: true,
		}],
		properties: [
			{
				displayName: 'Topic',
				name: 'sink',
				type: 'string',
				default: '',
				placeholder: 'topic-name',
				description: 'name of the queue of topic to publish to',
			},
			{
				displayName: 'Headers',
				name: 'headerParametersJson',
				type: 'json',
				default: '',
				description: 'Header parameters as JSON (flat object)',
			},
		]
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();
		const applicationProperties = this.getNodeParameter('headerParametersJson', {}) as IHeaders;

		let headerProperties = applicationProperties;
		if (typeof applicationProperties === 'string' && applicationProperties !== '') {
			headerProperties = JSON.parse(applicationProperties);
		}

		const credentials = this.getCredentials('kafka');
		if (!credentials) {
			throw new Error('Credentials are mandatory!');
		}

		const sink = this.getNodeParameter('sink', '') as string;


		if (sink === '') {
			throw new Error('Topic name required!');
		}

		const broker = credentials.hostname + ':' + credentials.port;
		const clientId = credentials.clientId.toString();

		const kafka = new Kafka({
			clientId: clientId,
			brokers: [broker]
		});

		const producer = kafka.producer();

		await producer.connect();

		let body = JSON.stringify(item.json);

		await producer.send({
			topic: sink,
			messages: [{
				 value: body,
				 headers: headerProperties,
			}],
		});

		await producer.disconnect()

		return { json: { success: 'true' } } as INodeExecutionData;
	}
}
