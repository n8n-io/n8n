import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDeferredPromise,
	IRun,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

const mockDataset = [
	'Can you explain how machine learning algorithms work in simple terms?',
	'Write a short story about a robot who discovers emotions.',
	'What are three strategies to improve productivity when working from home?',
	'I need help planning a week-long trip to Japan. Where should I visit?',
	'Analyze the pros and cons of electric vehicles versus traditional gasoline cars.',
	'What would be a good workout routine for someone just starting to exercise?',
	'Can you help me draft an email to request time off from work?',
	"Explain quantum computing as if I'm a 10-year-old.",
	'What are some creative ways to repurpose old furniture?',
	"I'm learning to code. What programming language should I start with and why?",
];

export class DummyDatasetTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Dummy Dataset Trigger',
		name: 'dummyDatasetTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger'],
		version: 1,
		description: 'Temporary replacement for the Dataset Trigger',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'Dummy Dataset',
			color: '#909298',
		},

		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'This node is where the workflow execution starts (when you click the ‘test’ button on the canvas).<br><br> <a data-action="showNodeCreator">Explore other ways to trigger your workflow</a> (e.g on a schedule, or a webhook)',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			void (async () => {
				for (const testCase of mockDataset) {
					const responsePromise: IDeferredPromise<IRun> = this.helpers.createDeferredPromise();

					this.emit(
						[this.helpers.returnJsonArray([{ text: testCase }])],
						undefined,
						responsePromise,
					);

					console.log(await responsePromise.promise);
				}
			})();

			// setTimeout(() => {
			// 	this.emit([this.helpers.returnJsonArray([{ text: mockDataset[1] }])]);
			// }, 3000);
		};

		return {
			manualTriggerFunction,
		};
	}

	getDataset(): {};
}
