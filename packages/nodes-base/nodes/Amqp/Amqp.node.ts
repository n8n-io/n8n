import { ContainerOptions, Delivery } from 'rhea';

import { IExecuteSingleFunctions } from 'n8n-core';
import {
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
			}
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
			port: credentials.port,
			reconnect: true,		// this id the default anyway
			reconnect_limit: 50, 	// try for max 50 times, based on a back-off algorithm
		};
		if (credentials.username || credentials.password) {
			container.options.username = credentials.username;
			container.options.password = credentials.password;
		}

		const allSent = new Promise(( resolve ) => {
			container.on('sendable', (context: any) => { // tslint:disable-line:no-any

				const message = {
					application_properties: headerProperties,
					body: item.json
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
