import { ContainerOptions, Delivery } from 'rhea';

import { IExecuteSingleFunctions } from 'n8n-core';
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
						description: 'Send only this property - If empty the hole Json will be sent',
					},
				],
			},
		]
	};

	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const credentials = this.getCredentials('amqp');
		if (!credentials) {
			throw new Error('Credentials are mandatory!');
		}

		const sink = this.getNodeParameter('sink', '') as string;
		const applicationProperties = this.getNodeParameter('headerParametersJson', {}) as string | object;
		const options = this.getNodeParameter('options', {}) as IDataObject;

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
		if (credentials.transportType) {
			connectOptions.transport = credentials.transportType;
		}

		const allSent = new Promise(( resolve ) => {
			container.on('sendable', (context: any) => { // tslint:disable-line:no-any

				let body: IDataObject | string = item.json;
				let prop = options.sendOnlyProperty as string;

				if(prop)
				{
					body = body[prop] as string;
				}

				if (options.dataAsObject !== true) {
					body = JSON.stringify(body);
				}

				const message = {
					application_properties: headerProperties,
					body
				};

				const sendResult = context.sender.send(message);

				resolve(sendResult);
			});
		});

		container.connect(connectOptions).open_sender(sink);

		const sendResult: Delivery = await allSent as Delivery;	// sendResult has a a property that causes circular reference if returned

		return { json: { id: sendResult.id } } as INodeExecutionData;
	}
}
