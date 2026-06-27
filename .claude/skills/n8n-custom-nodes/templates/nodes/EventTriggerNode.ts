/**
 * TEMPLATE: Event Trigger Node (generic trigger)
 *
 * Listens for events using an external library, protocol, or socket connection
 * (e.g. MQTT, AMQP, WebSocket, Redis Pub/Sub). Uses the trigger() method which
 * returns a closeFunction for cleanup and optionally a manualTriggerFunction
 * for testing.
 *
 * Key behavior:
 *   - trigger() is called when the workflow activates
 *   - this.emit() pushes data into the workflow when events arrive
 *   - closeFunction is called when the workflow deactivates
 *   - manualTriggerFunction is called during manual test execution
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 *   - __servicename__     → Icon filename (lowercase)
 */
import type {
	ITriggerFunctions,
	ITriggerResponse,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class __ServiceName__Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '__ServiceName__ Trigger',
		name: '__serviceName__Trigger',
		icon: 'file:__servicename__.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listens for __ServiceName__ events in real-time',
		defaults: {
			name: '__ServiceName__ Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: '__serviceNameApi__',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. my-channel',
				description: 'The channel or topic to subscribe to',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Only Content',
						name: 'onlyContent',
						type: 'boolean',
						default: false,
						description: 'Whether to return only the message content without metadata',
					},
					{
						displayName: 'JSON Parse Body',
						name: 'jsonParseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to try to parse the message body as JSON',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const channel = this.getNodeParameter('channel') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const credentials = await this.getCredentials('__serviceNameApi__');

		if (!channel) {
			throw new NodeOperationError(this.getNode(), 'Channel name is required');
		}

		// ---- Connect to external service ----
		// Replace this with your actual library connection logic
		const client = await createConnection(credentials);

		// ---- Subscribe and emit on events ----
		const messageHandler = (message: { channel: string; data: string; timestamp: number }) => {
			let content: IDataObject;

			if (options.jsonParseBody) {
				try {
					content = JSON.parse(message.data) as IDataObject;
				} catch {
					content = { data: message.data };
				}
			} else {
				content = { data: message.data };
			}

			const outputData: IDataObject = options.onlyContent
				? content
				: {
						channel: message.channel,
						timestamp: new Date(message.timestamp).toISOString(),
						...content,
					};

			this.emit([this.helpers.returnJsonArray([outputData])]);
		};

		client.subscribe(channel, messageHandler);

		// ---- Return cleanup + manual trigger ----
		return {
			closeFunction: async () => {
				client.unsubscribe(channel);
				await client.disconnect();
			},
			manualTriggerFunction: async () => {
				// For manual test execution, emit a sample event
				this.emit([
					this.helpers.returnJsonArray([
						{
							channel,
							data: 'Manual trigger test',
							timestamp: new Date().toISOString(),
						},
					]),
				]);
			},
		};
	}
}

// ---- Placeholder connection function ----
// Replace with actual library (e.g. ioredis, mqtt, rhea, ws)
interface Client {
	subscribe(channel: string, handler: (message: unknown) => void): void;
	unsubscribe(channel: string): void;
	disconnect(): Promise<void>;
}

async function createConnection(
	_credentials: ICredentialDataDecryptedObject,
): Promise<Client> {
	// Implement your connection logic here
	throw new Error('Not implemented - replace with actual connection logic');
}
