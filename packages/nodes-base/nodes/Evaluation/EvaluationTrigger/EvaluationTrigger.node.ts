import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { listSearch, loadOptions } from '../methods';
import {
	getFilteredResults,
	getGoogleSheet,
	getResults,
	getRowsLeft,
	getRowsLeftFilteredResults,
	getSheet,
} from '../utils/evaluationTriggerUtils';
import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { readFilter } from '../../Google/Sheet/v2/actions/sheet/read.operation';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import type { ILookupValues } from '../../Google/Sheet/v2/helpers/GoogleSheets.types';

export let startingRow = 1;

export class EvaluationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Evaluation Trigger',
		icon: 'fa:check-double',
		name: 'evaluationTrigger',
		group: ['trigger'],
		version: 4.6,
		description: 'Runs an evaluation',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'Evaluation Trigger',
		},

		inputs: [],
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
			{
				displayName:
					'Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. More info.', // TODO Change
				name: 'notice',
				type: 'notice',
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
				type: 'string',
				default: '10',
				description: 'Maximum number of rows to process',
				noDataExpression: false,
				displayOptions: { show: { limitRows: [true] } },
			},
			readFilter,
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
			? (this.getNodeParameter('maxRows', 0) as number)
			: MAX_ROWS;

		const rangeOptions = {
			rangeDefinition: 'specifyRange',
			headerRow: 1,
			firstDataRow: startingRow,
		};

		const googleSheetInstance = getGoogleSheet.call(this);

		const googleSheet = await getSheet.call(this, googleSheetInstance);

		let operationResult: INodeExecutionData[] = [];

		const hasFilter = this.getNodeParameter('filtersUI.values', 0, []) as ILookupValues[];

		if (hasFilter.length > 0) {
			operationResult = await getFilteredResults.call(
				this,
				operationResult,
				googleSheetInstance,
				googleSheet,
				startingRow,
				maxRows,
			);

			if (inputData[0].json.requestDataset) {
				return [operationResult];
			} else {
				operationResult = operationResult.length > 0 ? [operationResult[0]] : [];
			}

			if (operationResult.length === 0) {
				startingRow = 1;
				return [];
			}

			startingRow = (operationResult[0].json.row_number as number) + 1;

			const rowsLeft = operationResult.length
				? await getRowsLeftFilteredResults.call(
						this,
						googleSheetInstance,
						googleSheet.title,
						startingRow,
						maxRows,
					)
				: 0;

			operationResult.push({
				json: {
					_rowsLeft: rowsLeft,
				},
				pairedItems: [{ item: 0 }],
			});

			return [operationResult];
		} else {
			//  In order to preserve the header row, we need to set the startingRow to 1
			const rangeString = `${googleSheet.title}!${1}:${startingRow}`;

			operationResult = await getResults.call(
				this,
				operationResult,
				googleSheetInstance,
				googleSheet,
				rangeString,
				rangeOptions,
			);

			// This is for test runner which requires a different return format
			if (inputData[0].json.requestDataset) {
				const testRunnerResult = await getResults.call(
					this,
					operationResult,
					googleSheetInstance,
					googleSheet,
					`${googleSheet.title}!${1}:${maxRows}`,
					{},
				);
				return [testRunnerResult];
			}

			const rowsLeft = await getRowsLeft.call(
				this,
				googleSheetInstance,
				googleSheet.title,
				`${googleSheet.title}!${startingRow}:${maxRows}`,
			);

			if (operationResult.length === 0 && rowsLeft === 0) {
				startingRow = 1;
				return [];
			}

			operationResult.push({
				json: {
					_rowsLeft: rowsLeft,
				},
				pairedItems: [{ item: 0 }],
			});

			startingRow += 1;

			return [operationResult];
		}
	}
}
