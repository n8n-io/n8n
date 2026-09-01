import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type { ConnectionOptions, EventContext, ReceiverOptions } from 'rhea';
import { create_container } from 'rhea';

import { handleMessage } from './helpers/handleMessage';
import type { AmqpCredential } from './types';

export class AmqpTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AMQP Trigger',
		name: 'amqpTrigger',
		icon: 'file:amqp.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens to AMQP 1.0 messages',
		defaults: {
			name: 'AMQP Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'amqp',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Queue / Topic',
				name: 'sink',
				type: 'string',
				default: '',
				placeholder: 'topic://sourcename.something',
				description: 'Name of the queue or topic to listen to',
			},
			{
				displayName: 'Client Name',
				name: 'clientname',
				type: 'string',
				default: '',
				placeholder: 'e.g. n8n',
				description: 'Leave empty for non-durable topic subscriptions or queues',
				hint: 'For durable/persistent topic subscriptions',
			},
			{
				displayName: 'Subscription',
				name: 'subscription',
				type: 'string',
				default: '',
				placeholder: 'e.g. order-worker',
				description: 'Leave empty for non-durable topic subscriptions or queues',
				hint: 'For durable/persistent topic subscriptions',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				options: [
					{
						displayName: 'Container ID',
						name: 'containerId',
						type: 'string',
						default: '',
						description: 'Will be passed to the RHEA backend as container_id',
					},
					{
						displayName: 'Convert Body To String',
						name: 'jsonConvertByteArrayToString',
						type: 'boolean',
						default: false,
						description:
							'Whether to convert JSON body content (["body"]["content"]) from byte array to string. Needed for Azure Service Bus.',
					},
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to parse the body to an object',
					},
					{
						displayName: 'Messages per Cycle',
						name: 'pullMessagesNumber',
						type: 'number',
						default: 100,
						description: 'Number of messages to pull from the bus for every cycle',
					},
					{
						displayName: 'Only Body',
						name: 'onlyBody',
						type: 'boolean',
						default: false,
						description: 'Whether to return only the body property',
					},
					{
						displayName: 'Parallel Processing',
						name: 'parallelProcessing',
						type: 'boolean',
						default: true,
						description: 'Whether to process messages in parallel',
					},
					{
						displayName: 'Reconnect',
						name: 'reconnect',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically reconnect if disconnected',
					},
					{
						displayName: 'Reconnect Limit',
						name: 'reconnectLimit',
						type: 'number',
						default: 50,
						description: 'Maximum number of reconnect attempts',
					},
					{
						displayName: 'Sleep Time',
						name: 'sleepTime',
						type: 'number',
						default: 10,
						description: 'Milliseconds to sleep after every cycle',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = await this.getCredentials<AmqpCredential>('amqp');

		const sink = this.getNodeParameter('sink', '') as string;
		const clientname = this.getNodeParameter('clientname', '') as string;
		const subscription = this.getNodeParameter('subscription', '') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const parallelProcessing = this.getNodeParameter('options.parallelProcessing', true) as boolean;
		const pullMessagesNumber = (options.pullMessagesNumber as number) || 100;
		const containerId = options.containerId as string;
		const containerReconnect = (options.reconnect as boolean) || true;
		// Keep reconnecting (exponential backoff) forever unless user sets a limit
		const containerReconnectLimit = (options.reconnectLimit as number) ?? undefined;

		if (sink === '') {
			throw new NodeOperationError(this.getNode(), 'Queue or Topic required!');
		}

		let durable = false;

		if (subscription && clientname) {
			durable = true;
		}

		const container = create_container();

		let lastMsgId: string | number | Buffer | undefined = undefined;
		let inFlightMessages = 0;
		// rhea resets link credit when a reconnect attempt starts, so credit added
		// between disconnect and reattach would double-count with the grant below
		let receiverReady = true;

		container.on('disconnected', () => {
			receiverReady = false;
		});

		container.on('receiver_open', (context: EventContext) => {
			receiverReady = true;
			// on reconnect, executions from before the disconnect may still hold slots
			context.receiver?.add_credit(Math.max(0, pullMessagesNumber - inFlightMessages));
		});

		// each delivered message holds 1 link credit until it is done (processed,
		// skipped or failed), capping concurrent executions at pullMessagesNumber
		const processMessage = async (context: EventContext) => {
			if (!context.message) return null;
			inFlightMessages++;
			try {
				return await handleMessage.call(this, context, {
					lastMessageId: lastMsgId,
					jsonConvertByteArrayToString: options.jsonConvertByteArrayToString as boolean,
					jsonParseBody: options.jsonParseBody as boolean,
					onlyBody: options.onlyBody as boolean,
					parallelProcessing,
				});
			} finally {
				setTimeout(
					() => {
						inFlightMessages--;
						// while the link is down its freed slot is granted by receiver_open instead
						if (receiverReady) context.receiver?.add_credit(1);
					},
					(options.sleepTime as number) || 10,
				);
			}
		};

		container.on('message', async (context: EventContext) => {
			try {
				const result = await processMessage(context);
				if (result) {
					lastMsgId = result.messageId;
				}
			} catch (error) {
				this.saveFailedExecution(new NodeOperationError(this.getNode(), error as Error));
			}
		});

		/*
			Values are documented here: https://github.com/amqp/rhea#container
		 */
		const connectOptions: ConnectionOptions = {
			host: credentials.hostname,
			hostname: credentials.hostname,
			port: credentials.port,
			reconnect: containerReconnect,
			reconnect_limit: containerReconnectLimit,
			// Try reconnection even if caused by a fatal error
			all_errors_non_fatal: true,
			username: credentials.username ? credentials.username : undefined,
			password: credentials.password ? credentials.password : undefined,
			transport: credentials.transportType ? credentials.transportType : undefined,
			container_id: containerId ? containerId : undefined,
			id: containerId ? containerId : undefined,
		} as unknown as ConnectionOptions;
		const connection = container.connect(connectOptions);

		const clientOptions: ReceiverOptions = {
			name: subscription ? subscription : undefined,
			source: {
				address: sink,
				durable: durable ? 2 : undefined,
				expiry_policy: durable ? 'never' : undefined,
			},
			credit_window: 0, // prefetch 1
		};
		connection.open_receiver(clientOptions);

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			container.removeAllListeners('disconnected');
			container.removeAllListeners('receiver_open');
			container.removeAllListeners('message');
			connection.close();
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually.
		// for AMQP it doesn't make much sense to wait here but
		// for a new user who doesn't know how this works, it's better to wait and show a respective info message
		const manualTriggerFunction = async () => {
			await new Promise((resolve, reject) => {
				// remove the default message listener, setup our own for test trigger
				container.removeAllListeners('message');

				const timeoutHandler = setTimeout(() => {
					container.removeAllListeners('disconnected');
					container.removeAllListeners('receiver_open');
					container.removeAllListeners('message');
					connection.close();

					reject(
						new NodeOperationError(
							this.getNode(),
							'Aborted because no message was received within 15 seconds',
							{
								description:
									'This 15-second timeout only applies to manually triggered executions. Active workflows will listen indefinitely.',
							},
						),
					);
				}, 15000);
				container.on('message', async (context: EventContext) => {
					try {
						const result = await processMessage(context);
						if (result) {
							lastMsgId = result.messageId;
						}
						clearTimeout(timeoutHandler);
						resolve(true);
					} catch (error) {
						reject(error as Error);
					} finally {
						clearTimeout(timeoutHandler);
					}
				});
			});
		};

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
