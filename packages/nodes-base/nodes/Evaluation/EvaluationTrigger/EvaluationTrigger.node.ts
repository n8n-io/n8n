import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { readFilter } from '../../Google/Sheet/v2/actions/sheet/read.operation';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import type { ILookupValues } from '../../Google/Sheet/v2/helpers/GoogleSheets.types';
import { listSearch, loadOptions } from '../methods';
import {
	getGoogleSheet,
	getResults,
	getRowsLeft,
	getRowsLeftFilteredResults,
	getSheet,
} from '../utils/evaluationTriggerUtils';

export let startingRow = 2;

export class EvaluationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluation Trigger',
		icon: 'fa:check-double',
		name: 'evaluationTrigger',
		group: ['trigger'],
		version: 4.6,
		description: 'Run a test dataset through your workflow to check performance',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'When fetching a dataset row',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. Tips for wiring this node up [here].',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
			},
			authentication,
			document,
			sheet,
			{
				displayName: 'Limit Rows',
				name: 'limitRows',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether to limit number of rows to process',
			},
			{
				displayName: 'Max Rows to Process',
				name: 'maxRows',
				type: 'number',
				default: 10,
				description: 'Maximum number of rows to process',
				noDataExpression: false,
				displayOptions: { show: { limitRows: [true] } },
			},
			readFilter,
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				description: 'Run a test dataset through your workflow to check performance',
				options: [
					{
						name: 'Triggering an Evaluation',
						value: 'triggerEvaluation',
					},
				],
				default: 'triggerEvaluation',
				required: true,
			},
		],
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
	};

	methods = { loadOptions, listSearch };

	async execute(this: IExecuteFunctions, startRow?: number): Promise<INodeExecutionData[][]> {
		// We need to allow tests to reset the startingRow
		if (startRow) {
			startingRow = startRow;
		}

		const inputData = this.getInputData();

		const MAX_ROWS = 1000;

		const maxRows = this.getNodeParameter('limitRows', 0)
			? (this.getNodeParameter('maxRows', 0) as number) + 1
			: MAX_ROWS;

		const rangeOptions = {
			rangeDefinition: 'specifyRange',
			headerRow: 1,
			firstDataRow: startingRow,
		};

		const googleSheetInstance = getGoogleSheet.call(this);

		const googleSheet = await getSheet.call(this, googleSheetInstance);

		const allRows = await getResults.call(this, [], googleSheetInstance, googleSheet, rangeOptions);

		// This is for test runner which requires a different return format
		if (inputData[0].json.requestDataset) {
			const testRunnerResult = await getResults.call(
				this,
				[],
				googleSheetInstance,
				googleSheet,
				{},
			);

			testRunnerResult.filter((row) => (row?.json?.row_number as number) >= maxRows);

			return [testRunnerResult];
		}

		const hasFilter = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

		if (hasFilter.length > 0) {
			const currentRow = allRows[0];
			const currentRowNumber = currentRow.json?.row_number as number;

			if (currentRow === undefined) {
				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			const rowsLeft = await getRowsLeftFilteredResults.call(
				this,
				googleSheetInstance,
				googleSheet.title,
				currentRowNumber + 1,
				maxRows,
			);

			currentRow.json._rowsLeft = rowsLeft;

			startingRow = currentRowNumber + 1;

			if (rowsLeft === 0) {
				startingRow = 2;
			}

			return [[currentRow]];
		} else {
			const currentRow = allRows.find((row) => (row?.json?.row_number as number) === startingRow);

			const rowsLeft = await getRowsLeft.call(
				this,
				googleSheetInstance,
				googleSheet.title,
				`${googleSheet.title}!${startingRow}:${maxRows}`,
			);

			if (currentRow === undefined) {
				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			currentRow.json._rowsLeft = rowsLeft;

			startingRow += 1;

			if (rowsLeft === 0) {
				startingRow = 2;
			}

			return [[currentRow]];
		}

		// const hasFilter = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

		// if (hasFilter.length > 0) {
		// 	operationResult = await getFilteredResults.call(
		// 		this,
		// 		operationResult,
		// 		googleSheetInstance,
		// 		googleSheet,
		// 		startingRow,
		// 		maxRows,
		// 	);

		// 	if (inputData[0].json.requestDataset) {
		// 		return [operationResult];
		// 	} else {
		// 		operationResult = operationResult.length > 0 ? [operationResult[0]] : [];
		// 	}

		// 	if (operationResult.length === 0) {
		// 		startingRow = 1;
		// 		return [];
		// 	}

		// 	startingRow = (operationResult[0].json.row_number as number) + 1;

		// 	const rowsLeft = operationResult.length
		// 		? await getRowsLeftFilteredResults.call(
		// 				this,
		// 				googleSheetInstance,
		// 				googleSheet.title,
		// 				startingRow,
		// 				maxRows,
		// 			)
		// 		: 0;

		// 	operationResult[0].json._rowsLeft = rowsLeft

		// 	return [operationResult];
		// } else {

		// }
	}
}
