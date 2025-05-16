/* eslint-disable n8n-nodes-base/node-filename-against-convention */
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
	getNumberOfRowsLeftFiltered,
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
		defaults: {
			name: 'When fetching a dataset row',
			color: '#c3c9d5',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. Tips for wiring this node up <a href="https://docs.n8n.io/advanced-ai/evaluations/tips-and-common-issues/#combining-multiple-triggers">here</a>.',
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

			const result = testRunnerResult.filter((row) => (row?.json?.row_number as number) <= maxRows);

			return [result];
		}

		const hasFilter = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

		if (hasFilter.length > 0) {
			const currentRow = allRows[0];
			const currentRowNumber = currentRow.json?.row_number as number;

			if (currentRow === undefined) {
				startingRow = 2;

				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			const rowsLeft = await getNumberOfRowsLeftFiltered.call(
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
				startingRow = 2;

				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			currentRow.json._rowsLeft = rowsLeft;

			startingRow += 1;

			if (rowsLeft === 0) {
				startingRow = 2;
			}

			return [[currentRow]];
		}
	}
}
