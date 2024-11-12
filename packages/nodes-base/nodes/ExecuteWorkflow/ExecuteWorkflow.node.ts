import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	ExecuteWorkflowData,
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
		version: [1, 1.1],
		subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
		description: 'Execute another workflow',
		defaults: {
			name: 'Execute Workflow',
			color: '#ff6d5a',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
						'@version': [1],
					},
				},
				default: '',
				required: true,
				hint: 'Can be found in the URL of the workflow',
				description:
					"Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
			},
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'workflowSelector',
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.1 } }],
					},
				},
				default: '',
				required: true,
				hint: "Note on using an expression here: if this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
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
				placeholder: 'Add option',
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

		const workflowProxy = this.getWorkflowDataProxy(0);
		const currentWorkflowId = workflowProxy.$workflow.id as string;

		if (mode === 'each') {
			const returnData: INodeExecutionData[][] = [];

			for (let i = 0; i < items.length; i++) {
				try {
					const waitForSubWorkflow = this.getNodeParameter(
						'options.waitForSubWorkflow',
						i,
						true,
					) as boolean;
					const workflowInfo = await getWorkflowInfo.call(this, source, i);

					if (waitForSubWorkflow) {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
								},
							},
						);
						const workflowResult = executionResult.data as INodeExecutionData[][];

						for (const [outputIndex, outputData] of workflowResult.entries()) {
							for (const item of outputData) {
								item.pairedItem = { item: i };
								item.metadata = {
									subExecution: {
										executionId: executionResult.executionId,
										workflowId: workflowInfo.id ?? currentWorkflowId,
									},
								};
							}

							if (returnData[outputIndex] === undefined) {
								returnData[outputIndex] = [];
							}

							returnData[outputIndex].push(...outputData);
						}
					} else {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								doNotWaitToFinish: true,
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
								},
							},
						);

						if (returnData.length === 0) {
							returnData.push([]);
						}

						returnData[0].push({
							...items[i],
							metadata: {
								subExecution: {
									workflowId: workflowInfo.id ?? currentWorkflowId,
									executionId: executionResult.executionId,
								},
							},
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						if (returnData[i] === undefined) {
							returnData[i] = [];
						}
						returnData[i].push({ json: { error: error.message }, pairedItem: { item: i } });
						continue;
					}
					throw new NodeOperationError(this.getNode(), error, {
						message: `Error executing workflow with item at index ${i}`,
						description: error.message,
						itemIndex: i,
					});
				}
			}

			this.setMetadata({
				subExecutionsCount: items.length,
			});

			return returnData;
		} else {
			try {
				const waitForSubWorkflow = this.getNodeParameter(
					'options.waitForSubWorkflow',
					0,
					true,
				) as boolean;
				const workflowInfo = await getWorkflowInfo.call(this, source);

				const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
					workflowInfo,
					items,
					undefined,
					{
						doNotWaitToFinish: !waitForSubWorkflow,
						parentExecution: {
							executionId: workflowProxy.$execution.id,
							workflowId: workflowProxy.$workflow.id,
						},
					},
				);

				this.setMetadata({
					subExecution: {
						executionId: executionResult.executionId,
						workflowId: workflowInfo.id ?? (workflowProxy.$workflow.id as string),
					},
					subExecutionsCount: 1,
				});

				if (!waitForSubWorkflow) {
					return [items];
				}

				const workflowResult = executionResult.data as INodeExecutionData[][];

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
