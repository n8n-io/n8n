import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import { listSearch, loadOptions } from '../methods';
import { getGoogleSheet, getSheet } from '../utils/evaluationTriggerUtils';

export class Evaluation implements INodeType {
	outputs: INodeProperties = {
		displayName: 'Outputs',
		name: 'outputs',
		placeholder: 'Add Output',
		type: 'fixedCollection',
		typeOptions: {
			multipleValueButtonText: 'Add Output',
			multipleValues: true,
		},
		default: {},
		options: [
			{
				displayName: 'Filter',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'outputName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'outputValue',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	description: INodeTypeDescription = {
		displayName: 'Evaluation',
		icon: 'fa:check-double',
		name: 'evaluation',
		group: ['transform'],
		version: 4.6,
		description: 'Runs an evaluation',
		eventTriggerDescription: '',
		maxNodes: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		defaults: {
			name: 'Evaluation',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
				testedBy: 'googleApiCredentialTest',
			},
			{
				name: 'googleSheetsOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			authentication,
			document,
			sheet,
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Set Output',
						value: 'setOutput',
					},
					{
						name: 'Set Evaluation',
						value: 'setEvaluation',
					},
					{
						name: 'Check If Evaluating',
						value: 'checkIfEvaluating',
					},
				],
				default: 'setOutput',
			},
			this.outputs,
			{
				displayName: 'Disable for Normal Executions',
				name: 'disableNormalExecutions',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description:
					'Whether to execute this node in normal executions. If disabled, the node will only run when triggered by an evaluation trigger.',
			},
		],
	};

	methods = { loadOptions, listSearch };

	async execute(this: IExecuteFunctions) {
		const evaluationNode = this.getNode();
		const parentNodes = this.getParentNodes(evaluationNode.name);

		const evalTrigger = parentNodes.find(
			(node) => node.type === 'n8n-nodes-base.evaluationTrigger',
		);

		if (!evalTrigger) {
			this.addExecutionHints({
				message: "No outputs were set since the execution didn't start from an evaluation trigger",
				location: 'outputPane',
			});
			return [];
		}

		const outputFields = this.getNodeParameter('outputs.values', 0, []) as Array<{
			outputName: string;
			outputValue: string;
		}>;

		const googleSheetInstance = getGoogleSheet.call(this);
		const googleSheet = await getSheet.call(this, googleSheetInstance);

		if (!evalTrigger) {
			throw new NodeOperationError(evaluationNode, 'No evaluation trigger node found.');
		}

		const evaluationTrigger = this.evaluateExpression(
			`{{ $('${evalTrigger.name}').first().json }}`,
			0,
		) as IDataObject;

		const rowNumber =
			evaluationTrigger.row_number === 'row_number' ? 1 : evaluationTrigger.row_number;

		const columnNames = Object.keys(evaluationTrigger).filter(
			(key) => key !== 'row_number' && key !== '_rowsLeft',
		);

		outputFields.forEach(async ({ outputName }) => {
			if (!columnNames.includes(outputName)) {
				columnNames.push(outputName);
			}
		});

		await googleSheetInstance.updateRows(
			googleSheet.title,
			[columnNames],
			'RAW', // default value for Value Input Mode
			1, // header row
		);

		const outputs = outputFields.reduce((acc, { outputName, outputValue }) => {
			acc[outputName] = outputValue;
			return acc;
		}, {} as IDataObject);

		const preparedData = googleSheetInstance.prepareDataForUpdatingByRowNumber(
			[
				{
					row_number: rowNumber,
					...outputs,
				},
			],
			`${googleSheet.title}!A:Z`,
			[columnNames],
		);

		await googleSheetInstance.batchUpdate(
			preparedData.updateData,
			'RAW', // default value for Value Input Mode
		);

		return [this.getInputData()];
	}
}
