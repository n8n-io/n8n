import { NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { generatePairedItemData } from '../../utils/utilities';
import { getWorkflowInfo } from './GenericFunctions';

export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow',
		name: 'executeWorkflow',
		icon: 'fa:sign-in-alt',
		iconColor: 'orange-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
		description: 'Execute another workflow',
		defaults: {
			name: 'Execute Workflow',
			color: '#ff6d5a',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				noDataExpression: true,
				default: 'call_workflow',
				options: [
					{
						name: 'Call Another Workflow',
						value: 'call_workflow',
					},
				],
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Database',
						value: 'database',
						description: 'Load the workflow from the database by ID',
					},
					{
						name: 'Local File',
						value: 'localFile',
						description: 'Load the workflow from a locally saved file',
					},
					{
						name: 'Parameter',
						value: 'parameter',
						description: 'Load the workflow from a parameter',
					},
					{
						name: 'URL',
						value: 'url',
						description: 'Load the workflow from an URL',
					},
				],
				default: 'database',
				description: 'Where to get the workflow to execute from',
			},

			// ----------------------------------
			//         source:database
			// ----------------------------------
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				displayOptions: {
					show: {
						source: ['database'],
					},
				},
				default: '',
				required: true,
				hint: 'Can be found in the URL of the workflow',
				description:
					"Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
			},

			// ----------------------------------
			//         source:localFile
			// ----------------------------------
			{
				displayName: 'Workflow Path',
				name: 'workflowPath',
				type: 'string',
				displayOptions: {
					show: {
						source: ['localFile'],
					},
				},
				default: '',
				placeholder: '/data/workflow.json',
				required: true,
				description: 'The path to local JSON workflow file to execute',
			},

			// ----------------------------------
			//         source:parameter
			// ----------------------------------
			{
				displayName: 'Workflow JSON',
				name: 'workflowJson',
				type: 'json',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						source: ['parameter'],
					},
				},
				default: '\n\n\n',
				required: true,
				description: 'The workflow JSON code to execute',
			},

			// ----------------------------------
			//         source:url
			// ----------------------------------
			{
				displayName: 'Workflow URL',
				name: 'workflowUrl',
				type: 'string',
				displayOptions: {
					show: {
						source: ['url'],
					},
				},
				default: '',
				placeholder: 'https://example.com/workflow.json',
				required: true,
				description: 'The URL from which to load the workflow from',
			},
			{
				displayName:
					'Any data you pass into this node will be output by the Execute Workflow Trigger. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a>',
				name: 'executeWorkflowNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Run once with all items',
						value: 'once',
						description: 'Pass all items into a single execution of the sub-workflow',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Run once for each item',
						value: 'each',
						description: 'Call the sub-workflow individually for each item',
					},
				],
				default: 'once',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Wait For Sub-Workflow Completion',
						name: 'waitForSubWorkflow',
						type: 'boolean',
						default: true,
						description:
							'Whether the main workflow should wait for the sub-workflow to complete its execution before proceeding',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const source = this.getNodeParameter('source', 0) as string;
		const mode = this.getNodeParameter('mode', 0, false) as string;
		const items = this.getInputData();

		if (mode === 'each') {
			let returnData: INodeExecutionData[][] = [];

			for (let i = 0; i < items.length; i++) {
				try {
					const waitForSubWorkflow = this.getNodeParameter(
						'options.waitForSubWorkflow',
						i,
						true,
					) as boolean;
					const workflowInfo = await getWorkflowInfo.call(this, source, i);

					if (waitForSubWorkflow) {
						const workflowResult: INodeExecutionData[][] = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
						);

						for (const [outputIndex, outputData] of workflowResult.entries()) {
							for (const item of outputData) {
								item.pairedItem = { item: i };
							}

							if (returnData[outputIndex] === undefined) {
								returnData[outputIndex] = [];
							}

							returnData[outputIndex].push(...outputData);
						}
					} else {
						void this.executeWorkflow(workflowInfo, [items[i]]);
						returnData = [items];
					}
				} catch (error) {
					if (this.continueOnFail()) {
						return [[{ json: { error: error.message }, pairedItem: { item: i } }]];
					}
					throw new NodeOperationError(this.getNode(), error, {
						message: `Error executing workflow with item at index ${i}`,
						description: error.message,
						itemIndex: i,
					});
				}
			}

			return returnData;
		} else {
			try {
				const waitForSubWorkflow = this.getNodeParameter(
					'options.waitForSubWorkflow',
					0,
					true,
				) as boolean;
				const workflowInfo = await getWorkflowInfo.call(this, source);

				if (!waitForSubWorkflow) {
					void this.executeWorkflow(workflowInfo, items);
					return [items];
				}

				const workflowResult: INodeExecutionData[][] = await this.executeWorkflow(
					workflowInfo,
					items,
				);

				const fallbackPairedItemData = generatePairedItemData(items.length);

				for (const output of workflowResult) {
					const sameLength = output.length === items.length;

					for (const [itemIndex, item] of output.entries()) {
						if (item.pairedItem) continue;

						if (sameLength) {
							item.pairedItem = { item: itemIndex };
						} else {
							item.pairedItem = fallbackPairedItemData;
						}
					}
				}

				return workflowResult;
			} catch (error) {
				const pairedItem = generatePairedItemData(items.length);
				if (this.continueOnFail()) {
					return [[{ json: { error: error.message }, pairedItem }]];
				}
				throw error;
			}
		}
	}
}
