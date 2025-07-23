import { UserError, NodeOperationError } from 'n8n-workflow';
import type {
	INodeParameters,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';

import { metricHandlers } from './metricHandlers';
import { getGoogleSheet, getSheet } from './evaluationTriggerUtils';
import { composeReturnItem } from '../../Set/v2/helpers/utils';

export async function setOutput(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');
	const evalTriggerOutput = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: undefined;

	if (!evalTrigger || !evalTriggerOutput) {
		this.addExecutionHints({
			message: "No outputs were set since the execution didn't start from an evaluation trigger",
			location: 'outputPane',
		});
		return [this.getInputData()];
	}

	const outputFields = this.getNodeParameter('outputs.values', 0, []) as Array<{
		outputName: string;
		outputValue: string;
	}>;

	if (outputFields.length === 0) {
		throw new UserError('No outputs to set', {
			description: 'Add outputs to write back to the Google Sheet using the ‘Add Output’ button',
		});
	}

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

	outputFields.forEach(({ outputName }) => {
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

export async function setMetrics(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const metrics: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const metric = this.getNodeParameter('metric', i, {}) as keyof typeof metricHandlers;
		if (!metricHandlers.hasOwnProperty(metric)) {
			throw new NodeOperationError(this.getNode(), 'Unknown metric');
		}
		const newData = await metricHandlers[metric].call(this, i);

		const newItem: INodeExecutionData = {
			json: {},
			pairedItem: { item: i },
		};

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
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
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

export function setInputs(parameters: INodeParameters) {
	if (
		parameters.operation === 'setMetrics' &&
		['correctness', 'helpfulness'].includes(parameters.metric as string)
	) {
		return [
			{ type: 'main' },
			{ type: 'ai_languageModel', displayName: 'Model', maxConnections: 1 },
		];
	}

	return [{ type: 'main' }];
}
