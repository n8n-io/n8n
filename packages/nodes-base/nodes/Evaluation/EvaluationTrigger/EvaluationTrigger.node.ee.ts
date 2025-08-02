/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { readFilter } from '../../Google/Sheet/v2/actions/sheet/read.operation';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import type { ILookupValues } from '../../Google/Sheet/v2/helpers/GoogleSheets.types';
import { listSearch, loadOptions, credentialTest } from '../methods';
import {
	getGoogleSheet,
	getResults,
	getRowsLeft,
	getNumberOfRowsLeftFiltered,
	getSheet,
} from '../utils/evaluationTriggerUtils';

export const DEFAULT_STARTING_ROW = 2;

const MAX_ROWS = 1000;

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
			{
				...document,
				displayName: 'Document Containing Dataset',
				hint: 'Example dataset format <a href="https://docs.google.com/spreadsheets/d/1vD_IdeFUg7sHsK9okL6Doy1rGOkWTnPJV3Dro4FBUsY/edit?gid=0#gid=0">here</a>',
			},
			{ ...sheet, displayName: 'Sheet Containing Dataset' },
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
		codex: {
			alias: ['Test', 'Metrics', 'Evals', 'Set Output', 'Set Metrics'],
		},
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

	methods = { loadOptions, listSearch, credentialTest };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputData = this.getInputData();

		const maxRows = this.getNodeParameter('limitRows', 0, false)
			? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number) + 1
			: MAX_ROWS;

		const previousRunRowNumber = inputData?.[0]?.json?.row_number;
		const previousRunRowsLeft = inputData?.[0]?.json?._rowsLeft;

		const firstDataRow =
			typeof previousRunRowNumber === 'number' && previousRunRowsLeft !== 0
				? previousRunRowNumber + 1
				: DEFAULT_STARTING_ROW;
		const rangeOptions = {
			rangeDefinition: 'specifyRange',
			headerRow: 1,
			firstDataRow,
		};

		const googleSheetInstance = getGoogleSheet.call(this);

		const googleSheet = await getSheet.call(this, googleSheetInstance);

		const allRows = await getResults.call(this, [], googleSheetInstance, googleSheet, rangeOptions);

		const hasFilter = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

		if (hasFilter.length > 0) {
			const currentRow = allRows[0];
			const currentRowNumber = currentRow.json?.row_number as number;

			if (currentRow === undefined) {
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

			return [[currentRow]];
		} else {
			const currentRow = allRows.find((row) => (row?.json?.row_number as number) === firstDataRow);

			const rowsLeft = await getRowsLeft.call(
				this,
				googleSheetInstance,
				googleSheet.title,
				`${googleSheet.title}!${firstDataRow}:${maxRows}`,
			);

			if (currentRow === undefined) {
				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			currentRow.json._rowsLeft = rowsLeft;

			return [[currentRow]];
		}
	}

	customOperations = {
		dataset: {
			async getRows(
				this: IExecuteFunctions,
			): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
				try {
					const maxRows = this.getNodeParameter('limitRows', 0, false)
						? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number) + 1
						: MAX_ROWS;

					const googleSheetInstance = getGoogleSheet.call(this);
					const googleSheet = await getSheet.call(this, googleSheetInstance);

					const results = await getResults.call(this, [], googleSheetInstance, googleSheet, {});
					const result = results.slice(0, maxRows - 1);

					return [result];
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error);
				}
			},
		},
	};
}
