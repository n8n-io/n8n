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
				displayName: 'Boot and restart',
				name: 'init',
				type: 'boolean',
				default: true,
				description: 'Execute workflow starting from this node when n8n starts or restarts',
			},
			{
				displayName: 'Workflow updates',
				name: 'update',
				type: 'boolean',
				default: false,
				description: 'Execute workflow starting from this node every time you save this workflow.',
			},
			{
				displayName: 'Workflow activation',
				name: 'activate',
				type: 'boolean',
				default: false,
				description: 'Execute workflow starting from this node when you activate this workflow.',
			},
		]
	};


	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const init = this.getNodeParameter('init') as boolean;
		const update = this.getNodeParameter('update') as boolean;
		const activate = this.getNodeParameter('activate') as boolean;

		switch(this.getActivationMode()) {
			case 'init':
				if(init) this.emit([this.helpers.returnJsonArray([{activation: 'init'}])]);
				break;
			case 'update':
				if(update) this.emit([this.helpers.returnJsonArray([{activation: 'update'}])]);
				break;
			case 'activate':
				if(activate) this.emit([this.helpers.returnJsonArray([{activation: 'activate'}])]);
				break;
		}
		
		const self = this;
		async function manualTriggerFunction() {
			self.emit([self.helpers.returnJsonArray([{activation: 'manual'}])]);
		}

		return {
			manualTriggerFunction
		};
	}
}