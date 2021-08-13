console.log('HELLOOOOO');

import { ITriggerFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError
} from 'n8n-workflow';

import { Duration, ZBClient, ZBClientOptions, ZeebeJob } from 'zeebe-node';

export class CamundaCloudTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Camunda Cloud Trigger',
		name: 'camundaCloudTrigger',
		icon: 'file:camundaCloud.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers an n8n workflow from Camunda Cloud',
		defaults: {
			name: 'Camunda Cloud Trigger',
			color: '#ff6100'
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'camundaCloudApi',
				required: true
			}
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Task Type',
				name: 'taskType',
				type: 'string',
				default: '',
				required: true,
				description: 'The Task Type to subscribe to'
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				required: true,
				default: 60,
				description:
					'timeout in seconds before the BPMN task needs to be marked as completed'
			}
		]
	};

	async trigger_stub(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const self = this;
		return {
			closeFunction: async function() {
				console.log('CLOSE FUNCTION');
			},
			manualTriggerFunction: async function() {
				console.log('MANUAL TRIGGER');
				self.emit([self.helpers.returnJsonArray({ foo: 'bar', baz: 42 })]);
			}
		};
	}

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = this.getCredentials('camundaCloudApi');
		console.log(JSON.stringify(credentials));
		if (!credentials) {
			throw new NodeOperationError(
				this.getNode(),
				'Credentials are mandatory!'
			);
		}

		const { clientId, clientSecret, clusterId, clusterRegion } = credentials;

		const zbc = new ZBClient({
			camundaCloud: {
				clientId,
				clientSecret,
				clusterId,
				clusterRegion
			}
		} as ZBClientOptions);

		const self = this;

		// async function manualTriggerFunction() {
		// 	await new Promise((resolve, reject) => {
		// 		const zbWorker = zbc.createWorker({
		// 			taskType: self.getNodeParameter('taskType') as string,
		// 			timeout: Duration.seconds.of(
		// 				self.getNodeParameter('timeout') as number
		// 			),
		// 			taskHandler: (job: ZeebeJob) => {
		// 				console.log('executing taskHandler!', job);
		// 				self.emit([
		// 					self.helpers.returnJsonArray({
		// 						jobKey: job.key,
		// 						variables: job.variables
		// 					})
		// 				]);
		// 				//const jobResult = job.forward();
		// 				const jobResult = job.complete({});
		// 				resolve(true);
		// 				return jobResult;
		// 			}
		// 		});
		// 	});
		// }

		async function manualTriggerFunction() {
			const zbWorker = zbc.createWorker({
				taskType: self.getNodeParameter('taskType') as string,
				timeout: Duration.seconds.of(
					self.getNodeParameter('timeout') as number
				),
				taskHandler: async (job: ZeebeJob) => {
					console.log('executing taskHandler!', job);
					self.emit([
						self.helpers.returnJsonArray({
							jobKey: job.key,
							variables: job.variables
						})
					]);
					//const jobResult = job.forward();
					const res = await job.complete({});
					console.log('RESULT', { res });
					return res;
				}
			});
		}

		if (this.getMode() === 'trigger') {
			manualTriggerFunction();
		}

		async function closeFunction() {
			console.log('Closing Zeebe client...');
			zbc.close().then(() => console.log('All Zeebe workers closed'));
		}

		return {
			closeFunction,
			manualTriggerFunction
		};
	}
}
