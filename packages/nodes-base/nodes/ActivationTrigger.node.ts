import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class ActivationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Activation Trigger',
		name: 'ActivationTrigger',
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
				displayName: 'When to execute',
				name: 'whenToExecute',
				type: 'multiOptions',
				default: [],
				description: 'Specifies under which conditions an execution should happen. <br>' +
				'- <b>n8n start</b>: happens when n8n starts or restarts.<br>' +
				'- <b>Save changes</b>: When you save the workflow while it is active<br>' +
				'- <b>Activation</b>: When you  active the workflow.',
				options: [
					{
						name: 'n8n start',
						value: 'init',
						description: 'Whenever n8n starts or restarts.',
					},
					{
						name: 'Save changes',
						value: 'update',
						description: 'Whenever you save this workflow while it is active.',
					},
					{
						name: 'Activation',
						value: 'activate',
						description: 'Whenever you activate this workflow.',
					},
				],
			},
		],
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const init = this.getNodeParameter('whenToExecute', []) as string[];

		const activationMode = this.getActivationMode();

		if (init.includes(activationMode)) {
			this.emit([this.helpers.returnJsonArray([{activation: activationMode}])]);
		}

		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{activation: 'manual'}])]);
		}

		return {
			manualTriggerFunction,
		};
	}
}