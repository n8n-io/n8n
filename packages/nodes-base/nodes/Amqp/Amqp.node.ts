import { ContainerOptions, Delivery } from 'rhea';

import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Amqp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AMQP Sender',
		name: 'amqp',
		icon: 'file:amqp.png',
		group: ['transform'],
		version: 1,
		description: 'Sends a raw-message via AMQP 1.0, executed once per item',
		defaults: {
			name: 'AMQP Sender',
			color: '#00FF00',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{
			name: 'amqp',
			required: true,
		}],
		properties: [
			{
				displayName: 'Queue / Topic',
				name: 'sink',
				type: 'string',
				default: '',
				placeholder: 'topic://sourcename.something',
				description: 'name of the queue of topic to publish to',
			},
			// Header Parameters
			{
				displayName: 'Headers',
				name: 'headerParametersJson',
				type: 'json',
				default: '',
				description: 'Header parameters as JSON (flat object). Sent as application_properties in amqp-message meta info.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Data as Object',
						name: 'dataAsObject',
						type: 'boolean',
						default: false,
						description: 'Send the data as an object.',
					},
					{
						displayName: 'Send property',
						name: 'sendOnlyProperty',
						type: 'string',
						default: '',
						description: 'The only property to send. If empty the whole item will be sent.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise < INodeExecutionData[][] > {
		const credentials = this.getCredentials('amqp');
		if (!credentials) {
			throw new Error('Credentials are mandatory!');
		}

		const sink = this.getNodeParameter('sink', 0, '') as string;
		const applicationProperties = this.getNodeParameter('headerParametersJson', 0, {}) as string | object;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		let headerProperties = applicationProperties;
		if (typeof applicationProperties === 'string' && applicationProperties !== '') {
			headerProperties = JSON.parse(applicationProperties);
		}

		if (sink === '') {
			throw new Error('Queue or Topic required!');
		}

		const container = require('rhea');

		const connectOptions: ContainerOptions = {
			host: credentials.hostname,
			hostname: credentials.hostname,
			port: credentials.port,
			reconnect: true,		// this id the default anyway
			reconnect_limit: 50, 	// try for max 50 times, based on a back-off algorithm
		};
		if (credentials.username || credentials.password) {
			container.options.username = credentials.username;
			container.options.password = credentials.password;
			connectOptions.username = credentials.username;
			connectOptions.password = credentials.password;
		}
		if (credentials.transportType !== '') {
			connectOptions.transport = credentials.transportType;
		}

		const conn = container.connect(connectOptions);
		const sender = conn.open_sender(sink);

		const responseData: IDataObject[] = await new Promise((resolve) => {
			container.once('sendable', (context: any) => { // tslint:disable-line:no-any
				const returnData = [];

				const items = this.getInputData();
				for (let i = 0; i < items.length; i++) {
					const item = items[i];

					let body: IDataObject | string = item.json;
					const sendOnlyProperty = options.sendOnlyProperty as string;

					if (sendOnlyProperty) {
						body = body[sendOnlyProperty] as string;
					}

					if (options.dataAsObject !== true) {
						body = JSON.stringify(body);
					}

					const result = context.sender.send({
						application_properties: headerProperties,
						body,
					});

					returnData.push({ id: result.id });
				}

				resolve(returnData);
			});
		});

		sender.close();
		conn.close();

		return [this.helpers.returnJsonArray(responseData)];
	}
}
