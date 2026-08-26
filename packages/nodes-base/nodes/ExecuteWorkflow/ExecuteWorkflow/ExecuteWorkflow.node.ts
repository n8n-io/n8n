import { NodeConnectionTypes, NodeOperationError, parseErrorMetadata } from 'n8n-workflow';
import type {
	ExecuteWorkflowData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { findPairedItemThroughWorkflowData } from './../../../utils/workflow-backtracking';
import { getWorkflowInfo } from './GenericFunctions';
import { localResourceMapping } from './methods';
import { generatePairedItemData } from '../../../utils/utilities';
import { getCurrentWorkflowInputData } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

export class ExecuteWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Sub-workflow',
		name: 'executeWorkflow',
		icon: 'node:execute-sub-workflow',
		iconColor: 'orange-red',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
		subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
		description: 'Execute another workflow',
		defaults: {
			name: 'Execute Workflow',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		builderHint: {
			extraTypeDefContent: [
				{
					content: `<patterns>
These workflowInputs patterns apply to Execute Workflow node versions 1.2 and newer.
<pattern title="Child accepts all data">
Omit workflowInputs from parameters.
</pattern>
<pattern title="Child declares inputs">
workflowInputs: {
  mappingMode: 'defineBelow',
  value: {
    orderId: expr('{{ $json.id }}'),
    amount: expr('{{ $json.total }}'),
  },
  matchingColumns: [],
  schema: [
    {
      id: 'orderId',
      displayName: 'orderId',
      required: false,
      defaultMatch: false,
      display: true,
      canBeUsedToMatch: true,
      type: 'string',
    },
    {
      id: 'amount',
      displayName: 'amount',
      required: false,
      defaultMatch: false,
      display: true,
      canBeUsedToMatch: true,
      type: 'number',
    },
  ],
  attemptToConvertTypes: false,
  convertFieldsToString: true,
}
</pattern>
</patterns>`,
				},
			],
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				noDataExpression: true,
				default: 'call_workflow',
				options: [
					{
						name: 'Execute a Sub-Workflow',
						value: 'call_workflow',
					},
				],
			},
			{
				displayName: 'This node is out of date. Please upgrade by removing it and adding a new one',
				name: 'outdatedVersionWarning',
				type: 'notice',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
				default: '',
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
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
			},
			{
				displayName:
					'The "Local File" and "URL" sources are deprecated and will be removed in a future version. Import the workflow into this n8n instance and use the "Database" source, or paste its JSON into the "Parameter" source instead.',
				name: 'sourceDeprecationNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						source: ['localFile', 'url'],
						'@version': [{ _cnd: { lte: 1.1 } }],
					},
				},
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
						name: 'Define Below',
						value: 'parameter',
						description: 'Pass the JSON code of a workflow',
					},
				],
				default: 'database',
				description: 'Where to get the workflow to execute from',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.2 } }] } },
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
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.1 } }] } },
			},
			{
				displayName: 'Workflow Inputs',
				name: 'workflowInputs',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				builderHint: {
					propertyHint:
						"The default { mappingMode: 'defineBelow', value: null } is only a temporary UI initialization state and must never be emitted in a workflow. Omit workflowInputs when the selected sub-workflow's trigger is set to 'Accept all data'. When the trigger declares inputs, pass the full Resource Mapper object and make the value and schema fields exactly match the declared input names and types.",
				},
				typeOptions: {
					loadOptionsDependsOn: ['workflowId.value'],
					resourceMapper: {
						localResourceMapperMethod: 'loadSubWorkflowInputs',
						valuesLabel: 'Workflow Inputs',
						mode: 'map',
						fieldWords: {
							singular: 'input',
							plural: 'inputs',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						showTypeConversionOptions: true,
						refreshStaleSchemaOnOpen: true,
					},
				},
				displayOptions: {
					show: {
						source: ['database'],
						'@version': [{ _cnd: { gte: 1.2 } }],
					},
					hide: {
						workflowId: [''],
					},
				},
			},
			{
				// Kept as a hidden parameter on the versions that offered the mode:
				// Workflow construction strips parameters that are not declared (or not
				// displayed) for the node's version, and the runtime guard in execute()
				// needs to see a stale 'each' value to fail loudly on it. On 1.4+ the
				// value is stripped and the node always runs once with all items.
				displayName: 'Mode',
				name: 'mode',
				type: 'hidden',
				noDataExpression: true,
				default: 'once',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { lte: 1.3 } }],
					},
				},
			},
			{
				displayName:
					'The "Run once for each item" mode is no longer available, so this node will fail. Replace it with a new "Execute Sub-workflow" node. To run the sub-workflow once per item, add a "Loop Over Items" node before the new node.',
				name: 'eachModeRemovedNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						mode: ['each'],
						'@version': [{ _cnd: { lte: 1.3 } }],
					},
				},
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
		hints: [
			{
				type: 'info',
				message:
					"Note on using an expression for workflow ID: Since this node is set to run once with all items, they will all be sent to the <em>same</em> workflow. That workflow's ID will be calculated by evaluating the expression for the <strong>first input item</strong>.",
				displayCondition:
					'={{ $rawParameter.workflowId.startsWith("=") && ($nodeVersion >= 1.4 || ($nodeVersion >= 1.2 && $parameter.mode === "once")) }}',
				whenToDisplay: 'always',
				location: 'outputPane',
			},
		],
	};

	methods = {
		localResourceMapping,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const source = this.getNodeParameter('source', 0) as string;
		const items = getCurrentWorkflowInputData.call(this);

		const workflowProxy = this.getWorkflowDataProxy(0);

		// The mode selection is gone, but nodes saved before its removal may still carry the value
		if (this.getNodeParameter('mode', 0, 'once') === 'each') {
			throw new NodeOperationError(
				this.getNode(),
				'The "Run once for each item" mode is no longer available',
				{
					description:
						'Replace this node with a new "Execute Sub-workflow" node. To run the sub-workflow once per item, add a "Loop Over Items" node before the new node.',
				},
			);
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
							shouldResume: waitForSubWorkflow,
						},
						executionMode: this.getMode(),
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

				const workflowRunData = await this.getExecutionDataById(executionResult.executionId);

				const workflowResult = executionResult.data as INodeExecutionData[][];

				const fallbackPairedItemData = generatePairedItemData(items.length);

				for (const output of workflowResult) {
					const sameLength = output.length === items.length;

					for (const [itemIndex, item] of output.entries()) {
						if (item.pairedItem) {
							// If the item already has a paired item, we need to follow these to the start of the child workflow
							if (workflowRunData !== undefined) {
								const pairedItem = findPairedItemThroughWorkflowData(
									workflowRunData,
									item,
									itemIndex,
								);
								if (pairedItem !== undefined) {
									item.pairedItem = pairedItem;
								}
							}
							continue;
						}

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
					const metadata = parseErrorMetadata(error);
					return [
						[
							{
								json: { error: error.message },
								metadata,
								pairedItem,
							},
						],
					];
				}
				throw error;
			}
		}
	}
}
