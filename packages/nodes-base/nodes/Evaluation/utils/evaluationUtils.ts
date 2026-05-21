import {
	UserError,
	NodeOperationError,
	EVALUATION_TRIGGER_NODE_TYPE,
	jsonStringify,
} from 'n8n-workflow';
import type {
	INodeParameters,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	JsonObject,
	JsonValue,
	DataTableColumnJsType,
} from 'n8n-workflow';

import { getGoogleSheet, getSheet } from './evaluationTriggerUtils';
import { metricHandlers } from './metricHandlers';
import { composeReturnItem } from '../../Set/v2/helpers/utils';
import assert from 'node:assert';

function withEvaluationData(this: IExecuteFunctions, data: JsonObject): INodeExecutionData[] {
	const inputData = this.getInputData();
	if (!inputData.length) {
		return inputData;
	}

	const isEvaluationMode = this.getMode() === 'evaluation';
	return [
		{
			...inputData[0],
			// test-runner only looks at first item. Don't need to duplicate the data for each item
			evaluationData: isEvaluationMode ? data : undefined,
		},
		...inputData.slice(1),
	];
}

function isOutputsArray(
	value: unknown,
): value is Array<{ outputName: string; outputValue: JsonValue }> {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				typeof item === 'object' &&
				item !== null &&
				'outputName' in item &&
				'outputValue' in item &&
				typeof item.outputName === 'string',
		)
	);
}

export function toDataTableValue(value: JsonValue): DataTableColumnJsType {
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		value instanceof Date ||
		value === null
	)
		return value;

	return jsonStringify(value);
}

const toDataTableColumnType = (value: JsonValue) => {
	switch (typeof value) {
		case 'string':
			return 'string';
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'object':
			if (value instanceof Date) {
				return 'date';
			}
			// this catches null, arrays and objects
			return 'string';
		default:
			return 'string';
	}
};

export async function setOutputs(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === EVALUATION_TRIGGER_NODE_TYPE);
	const isEvalTriggerExecuted = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: false;

	if (!evalTrigger || !isEvalTriggerExecuted) {
		this.addExecutionHints({
			message: "No outputs were set since the execution didn't start from an evaluation trigger",
			location: 'outputPane',
		});
		return [this.getInputData()];
	}

	const outputFields = this.getNodeParameter('outputs.values', 0, []);
	assert(
		isOutputsArray(outputFields),
		'Invalid output fields format. Expected an array of objects with outputName and outputValue properties.',
	);

	if (outputFields.length === 0) {
		throw new UserError('No outputs to set', {
			description: 'Add outputs to write back to the Google Sheet using the ‘Add Output’ button',
		});
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

	outputFields.forEach(({ outputName }) => {
		if (!columnNames.includes(outputName)) {
			columnNames.push(outputName);
		}
	});

	const outputs = outputFields.reduce<JsonObject>((acc, { outputName, outputValue }) => {
		acc[outputName] = outputValue;
		return acc;
	}, {});

	const source = this.getNodeParameter('source', 0) as string;

	if (source === 'dataTable') {
		if (this.helpers.getDataTableProxy === undefined) {
			throw new NodeOperationError(
				this.getNode(),
				'Attempted to use Data table node but the module is disabled',
			);
		}

		const dataTableId = this.getNodeParameter('dataTableId', 0, undefined, {
			extractValue: true,
		}) as string;
		const dataTableProxy = await this.helpers.getDataTableProxy(dataTableId);

		const rowId = typeof evaluationTrigger.row_id === 'number' ? evaluationTrigger.row_id : 1;

		const data = Object.fromEntries(
			Object.entries(outputs).map(([k, v]) => [k, toDataTableValue(v)]),
		);

		const columns = await dataTableProxy.getColumns();
		for (const [columnName, value] of Object.entries(outputs)) {
			if (columns.find((c) => c.name === columnName)) {
				continue;
			}

			await dataTableProxy.addColumn({
				name: columnName,
				type: toDataTableColumnType(value),
			});
		}

		await dataTableProxy.updateRows({
			filter: {
				type: 'and',
				filters: [
					{
						columnName: 'id',
						condition: 'eq',
						value: rowId,
					},
				],
			},
			data,
		});
	} else if (source === 'googleSheets') {
		const googleSheetInstance = getGoogleSheet.call(this);
		const googleSheet = await getSheet.call(this, googleSheetInstance);

		await googleSheetInstance.updateRows(
			googleSheet.title,
			[columnNames],
			'RAW', // default value for Value Input Mode
			1, // header row
		);

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
	} else {
		throw new NodeOperationError(this.getNode(), `Unknown source "${source}"`);
	}

	return [withEvaluationData.call(this, outputs)];
}

function isInputsArray(
	value: unknown,
): value is Array<{ inputName: string; inputValue: JsonValue }> {
	return (
		Array.isArray(value) &&
		value.every(
			(item) =>
				typeof item === 'object' &&
				item !== null &&
				'inputName' in item &&
				'inputValue' in item &&
				typeof item.inputName === 'string',
		)
	);
}

export function setInputs(this: IExecuteFunctions): INodeExecutionData[][] {
	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');
	const isEvalTriggerExecuted = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: false;

	if (!evalTrigger || !isEvalTriggerExecuted) {
		this.addExecutionHints({
			message: "No inputs were set since the execution didn't start from an evaluation trigger",
			location: 'outputPane',
		});
		return [this.getInputData()];
	}

	const inputFields = this.getNodeParameter('inputs.values', 0, []);
	assert(
		isInputsArray(inputFields),
		'Invalid input fields format. Expected an array of objects with inputName and inputValue properties.',
	);

	if (inputFields.length === 0) {
		throw new UserError('No inputs to set', {
			description: 'Add inputs using the ‘Add Input’ button',
		});
	}

	const inputs = inputFields.reduce<JsonObject>((acc, { inputName, inputValue }) => {
		acc[inputName] = inputValue;
		return acc;
	}, {});

	return [withEvaluationData.call(this, inputs)];
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
	const isEvalTriggerExecuted = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: false;

	if (isEvalTriggerExecuted) {
		return [this.getInputData(), normalExecutionResult];
	} else {
		return [evaluationExecutionResult, this.getInputData()];
	}
}

export function getOutputConnectionTypes(parameters: INodeParameters) {
	if (parameters.operation === 'checkIfEvaluating') {
		return [
			{ type: 'main', displayName: 'Evaluation' },
			{ type: 'main', displayName: 'Normal' },
		];
	}

	return [{ type: 'main' }];
}

export function getInputConnectionTypes(
	parameters: INodeParameters,
	metricRequiresModelConnectionFn: (metric: string) => boolean,
) {
	if (
		parameters.operation === 'setMetrics' &&
		metricRequiresModelConnectionFn(parameters.metric as string)
	) {
		return [
			{ type: 'main' },
			{ type: 'ai_languageModel', displayName: 'Model', maxConnections: 1 },
		];
	}

	return [{ type: 'main' }];
}
