import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	FieldType,
	INodeParameters,
	type AssignmentCollectionValue,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import { getGoogleSheet, getSheet } from './evaluationTriggerUtils';
import { composeReturnItem, validateEntry } from '../../Set/v2/helpers/utils';

export async function setOutput(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');

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

export async function setEvaluation(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const metrics: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const dataToSave = this.getNodeParameter('metrics', i, {}) as AssignmentCollectionValue;

		const newItem: INodeExecutionData = {
			json: {},
			pairedItem: { item: i },
		};
		const newData = Object.fromEntries(
			(dataToSave?.assignments ?? []).map((assignment) => {
				const assignmentValue =
					typeof assignment.value === 'number' ? assignment.value : Number(assignment.value);

				if (!assignment.name && !isNaN(assignmentValue)) {
					throw new NodeOperationError(this.getNode(), 'Metric name missing', {
						description: 'Make sure each metric you define has a name',
					});
				}

				if (isNaN(assignmentValue)) {
					throw new NodeOperationError(this.getNode(), `"${assignment.name}" isn't a number`, {
						description: `It’s currently '${assignment.value}'. Metrics must be numeric.`,
					});
				}

				const { name, value } = validateEntry(
					assignment.name,
					assignment.type as FieldType,
					assignmentValue,
					this.getNode(),
					i,
					false,
					1,
				);

				return [name, value];
			}),
		);

		const returnItem = composeReturnItem.call(
			this,
			i,
			newItem,
			newData,
			{ dotNotation: false, include: 'none' },
			1,
		);
		metrics.push(returnItem);
	}

	return [metrics];
}

export async function checkIfEvaluating(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationExecutionResult: INodeExecutionData[] = [];
	const normalExecutionResult: INodeExecutionData[] = [];

	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');
	const evalTriggerOutput = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').first() }}`, 0)
		: undefined;

	if (evalTriggerOutput) {
		return [this.getInputData(), normalExecutionResult];
	} else {
		return [evaluationExecutionResult, this.getInputData()];
	}
}

export function setOutputs(parameters: INodeParameters) {
	if (parameters.operation === 'checkIfEvaluating') {
		return [
			{ type: 'main', displayName: 'Evaluation' },
			{ type: 'main', displayName: 'Normal' },
		];
	}

	return [{ type: 'main' }];
}
