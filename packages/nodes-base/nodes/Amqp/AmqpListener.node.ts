import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,

} from 'n8n-workflow';


export class AmqpListener implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AMQP Listener',
		name: 'amqpListener',
		icon: 'file:amqp.png',
		group: ['trigger'],
		version: 1,
		description: 'Listens to AMQP 1.0 Messages',
		defaults: {
			name: 'AMQP Listener',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [{
			name: 'amqp',
			required: false,
		}],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Host',
				name: 'hostname',
				type: 'string',
				default: 'localhost',
				description: 'hostname of the amqp server',
			},
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 5672,
				description: 'TCP Port to connect to',
			},
			{
				displayName: 'Queue / Topic',
				name: 'sink',
				type: 'string',
				default: '',
				placeholder: 'topic://sourcename.something',
				description: 'name of the queue of topic to listen to',
			},
			{
				displayName: 'Clientname',
				name: 'clientname',
				type: 'string',
				default: '',
				placeholder: 'for durable/persistent topic subscriptions, example: "n8n"',
				description: 'Leave empty for non-durable topic subscriptions or queues. ',
			},
			{
				displayName: 'Subscription',
				name: 'subscription',
				type: 'string',
				default: '',
				placeholder: 'for durable/persistent topic subscriptions, example: "order-worker"',
				description: 'Leave empty for non-durable topic subscriptions or queues',
			},
		]
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {

		const credentials = this.getCredentials('amqp');

		const hostname = this.getNodeParameter('hostname', 'localhost') as string;
		const port = this.getNodeParameter('port', 5672) as number;
		const sink = this.getNodeParameter('sink', '') as string;
		const clientname = this.getNodeParameter('clientname', '') as string;
		const subscription = this.getNodeParameter('subscription', '') as string;

		if (sink == '') {
			throw new Error('Queue or Topic required!');
		}
		let durable: boolean = false;
		if(subscription && clientname) {
			console.log('durable subscription')
			durable = true;
		}

		let container = require('rhea');
		let connectOptions = {
			host: hostname,
			port: port,
			reconnect: true,		// this id the default anyway
			reconnect_limit: 50,	// try for max 50 times, based on a back-off algorithm
			container_id: (durable ? clientname : null)
		}
		if (credentials) {
			container.options.username = credentials.username;
			container.options.password = credentials.password;
		}

		let lastMsgId: any = undefined;
		let self = this;

		container.on('message', function (context: any) {
			console.log('AMQP: received message id: ' + (context.message.message_id ? context.message.message_id : ''));
			console.log(context.message.body);
			if (context.message.message_id && context.message.message_id == lastMsgId) {
				// ignore duplicate message check, don't think it's necessary, but it was in the rhea-lib example code
				console.log('duplicate received: ' + context.message.message_id);
				lastMsgId = context.message.message_id;
				return;
			}
			self.emit([self.helpers.returnJsonArray([context.message])]);
		});
		
		let connection = container.connect(connectOptions);
		let clientOptions = undefined;
		if (durable) {
			clientOptions = {
				name: subscription,
				source: {
					address: sink,
					durable: 2,
					expiry_policy: 'never'
				},
				credit_window: 1	// prefetch 1
			}
		} else {
			clientOptions = {
				source: {
					address: sink,
				},
				credit_window: 1	// prefetch 1
			}
		}
		connection.open_receiver(clientOptions);
		console.log('AMQP: listener attached');


		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			connection.close();
			console.log('AMQP: listener closed');
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually.
		// does not make really sense for AMQP
		async function manualTriggerFunction() {
			console.log('AMQP: manual trigger clicked, this will make the node spinn, until a message is received on: ' + sink);
/*			self.emit([self.helpers.returnJsonArray([{
				error: '"manually triggered execution" stops the node right afterwards which unsubscribes the listener from the service bus. You need to activate the workflow to test.'
			}])]); */
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};

	}
}
