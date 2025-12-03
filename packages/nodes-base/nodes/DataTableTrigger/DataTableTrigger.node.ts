import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class DataTableTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Table Trigger',
		name: 'dataTableTrigger',
		icon: 'fa:table',
		group: ['trigger'],
		version: [1],
		description: 'Triggers the workflow on data table events',
		eventTriggerDescription: '',
		activationMessage: 'Your data table trigger will now trigger executions on data table changes.',
		defaults: {
			name: 'Data Table Trigger',
			color: '#31C49F',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const executeTrigger = (a: any) => {
			console.log('IT"S ALIVE');
			console.log(a);

			this.emit([this.helpers.returnJsonArray([{ hi: a }])]);
		};

		if (this.getMode() !== 'manual') {
			this.helpers.eventTriggerManager?.registerTrigger('data-table-rows-added', (a: any) =>
				executeTrigger(a),
			);

			return {};
		} else {
			const manualTriggerFunction = async () => {
				executeTrigger({ a: 3 });
			};

			return { manualTriggerFunction };
		}
	}
}
