import {
	ContainerOptions,
	create_container,
	Dictionary,
	EventContext,
} from 'rhea';

import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
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
						displayName: 'Container ID',
						name: 'containerId',
						type: 'string',
						default: '',
						description: 'Will be used to pass to the RHEA Backend as container_id',
					},
					{
						displayName: 'Data as Object',
						name: 'dataAsObject',
						type: 'boolean',
						default: false,
						description: 'Send the data as an object.',
					},
					{
						displayName: 'Reconnect',
						name: 'reconnect',
						type: 'boolean',
						default: true,
						description: 'Automatically reconnect if disconnected',
					},
					{
						displayName: 'Reconnect Limit',
						name: 'reconnectLimit',
						type: 'number',
						default: 50,
						description: 'Maximum number of reconnect attempts',
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('amqp');
		if (!credentials) {
			throw new NodeOperationError(this.getNode(), 'Credentials are mandatory!');
		}

		const sink = this.getNodeParameter('sink', 0, '') as string;
		const applicationProperties = this.getNodeParameter('headerParametersJson', 0, {}) as string | object;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;
		const containerId = options.containerId as string;
		const containerReconnect = options.reconnect as boolean || true;
		const containerReconnectLimit = options.reconnectLimit as number || 50;

		let headerProperties: Dictionary<any>; // tslint:disable-line:no-any
		if (typeof applicationProperties === 'string' && applicationProperties !== '') {
			headerProperties = JSON.parse(applicationProperties);
		} else {
			headerProperties = applicationProperties as object;
		}

		if (sink === '') {
			throw new NodeOperationError(this.getNode(), 'Queue or Topic required!');
		}

		const container = create_container();

		/*
			Values are documentet here: https://github.com/amqp/rhea#container
		 */
		const connectOptions: ContainerOptions = {
			host: credentials.hostname,
			hostname: credentials.hostname,
			port: credentials.port,
			reconnect: containerReconnect,
			reconnect_limit: containerReconnectLimit,
			username: credentials.username ? credentials.username : undefined,
			password: credentials.password ? credentials.password : undefined,
			transport: credentials.transportType ? credentials.transportType : undefined,
			container_id: containerId ? containerId : undefined,
			id: containerId ? containerId : undefined,
		};
		const conn = container.connect(connectOptions);

		const sender = conn.open_sender(sink);

		const responseData: IDataObject[] = await new Promise((resolve) => {
			container.once('sendable', (context: EventContext) => {
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

					const result = context.sender?.send({
						application_properties: headerProperties,
						body,
					});

					returnData.push({ id: result?.id });
				}

				resolve(returnData);
			});
		});

		sender.close();
		conn.close();

		return [this.helpers.returnJsonArray(responseData)];
	}
}
