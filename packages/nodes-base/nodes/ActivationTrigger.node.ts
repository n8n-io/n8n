import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class ActivationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Activation Trigger',
		name: 'activationTrigger',
		icon: 'fa:play-circle',
		group: ['trigger'],
		version: 1,
		description: 'Executes whenever the workflow becomes active.',
		defaults: {
			name: 'Activation Trigger',
			color: '#00e000',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Specifies under which conditions an execution should happen:<br />' +
					'- <b>Activation</b>: Workflow gets activated<br />' +
					'- <b>Update</b>: Workflow gets saved while active<br>' +
					'- <b>Start</b>: n8n starts or restarts',
				options: [
					{
						name: 'Activation',
						value: 'activate',
						description: 'Run when workflow gets activated',
					},
					{
						name: 'Start',
						value: 'init',
						description: 'Run when n8n starts or restarts',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Run when workflow gets saved while it is active',
					},
				],
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const events = this.getNodeParameter('events', []) as string[];

		const activationMode = this.getActivationMode();

		if (events.includes(activationMode)) {
			this.emit([this.helpers.returnJsonArray([{ activation: activationMode }])]);
		}

		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{ activation: 'manual' }])]);
		}

		return {
			manualTriggerFunction,
		};
	}
}
