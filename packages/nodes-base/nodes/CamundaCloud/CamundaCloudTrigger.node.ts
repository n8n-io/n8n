import { ITriggerFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeOperationError,
} from 'n8n-workflow';

import {
	Duration,
	ICustomHeaders,
	IInputVariables,
	IOutputVariables,
	ZBClient,
	ZBClientOptions,
	ZBWorker,
	ZeebeJob,
} from 'zeebe-node';

export class CamundaCloudTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Camunda Cloud Trigger',
		name: 'camundaCloudTrigger',
		subtitle: '=task: {{$parameter["taskType"]',
		icon: 'file:camundaCloud.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers an n8n workflow from Camunda Cloud',
		defaults: {
			name: 'Camunda Cloud Trigger',
			color: '#ff6100',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'camundaCloudApi',
				required: true,
			},
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
				description: 'The Task Type to subscribe to',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				required: true,
				default: 60,
				description:
					'Timeout in seconds before the BPMN task needs to be marked as completed',
			},
			{
				displayName: 'Auto Complete',
				name: 'autoComplete',
				type: 'boolean',
				required: true,
				default: true,
				description:
					'Whether new jobs should automatically be marked as completed. Otherwise you need to explicitly complete the job with another Camunda Cloud node.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const credentials = this.getCredentials('camundaCloudApi');
		console.log(JSON.stringify(credentials));
		if (!credentials) {
			throw new NodeOperationError(
				this.getNode(),
				'Credentials are mandatory!',
			);
		}

		const {
			clientId,
			clientSecret,
			clusterId,
			clusterRegion,
		} = credentials;

		const zbc = new ZBClient({
			camundaCloud: {
				clientId,
				clientSecret,
				clusterId,
				clusterRegion,
			},
		} as ZBClientOptions);

		const self = this;

		let zbWorker: ZBWorker<
			IInputVariables,
			ICustomHeaders,
			IOutputVariables
		>;

		async function manualTriggerFunction() {
			if (zbWorker) {
				return;
			}

			zbWorker = zbc.createWorker({
				taskType: self.getNodeParameter('taskType') as string,
				timeout: Duration.seconds.of(
					self.getNodeParameter('timeout') as number,
				),
				taskHandler: async (job: ZeebeJob) => {
					self.emit([
						self.helpers.returnJsonArray({
							jobKey: job.key,
							variables: job.variables,
						} as IDataObject),
					]);

					if (self.getNodeParameter('autoComplete') as boolean) {
						return await job.complete({});
					} else {
						return job.forward();
					}
				},
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
			manualTriggerFunction,
		};
	}
}
