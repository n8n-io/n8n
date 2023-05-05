import { ITriggerFunctions, INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow';

export class ClassNameReplace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DisplayNameReplace',
		name: 'N8nNameReplace',
		group: ['trigger'],
		version: 1,
		description: 'NodeDescriptionReplace',
		defaults: {
			name: 'DisplayNameReplace',
			color: '#00FF00',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Every how many minutes the workflow should be triggered.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const interval = this.getNodeParameter('interval', 1) as number;

		if (interval <= 0) {
			throw new Error('The interval has to be set to at least 1 or higher!');
		}

		const executeTrigger = () => {
			// Every time the emit function gets called a new workflow
			// executions gets started with the provided entries.
			const entry = {
				exampleKey: 'exampleData',
			};
			this.emit([this.helpers.returnJsonArray([entry])]);
		};

		// Sets an interval and triggers the workflow all n seconds
		// (depends on what the user selected on the node)
		const intervalValue = interval * 60 * 1000;
		const intervalObj = setInterval(executeTrigger, intervalValue);

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			clearInterval(intervalObj);
		}

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.
		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
