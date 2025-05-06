import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { loadOptions, listSearch } from './methods';
import {
	getGoogleSheet,
	getResults,
	getRowsLeft,
	getRowsLeftFilteredResults,
	getSheet,
} from './utils/evaluationTriggerUtils';
import { document, sheet } from '../Google/Sheet/GoogleSheetsTrigger.node';
import { readFilter } from '../Google/Sheet/v2/actions/sheet/read.operation';
import { authentication } from '../Google/Sheet/v2/actions/versionDescription';
import type { ILookupValues } from '../Google/Sheet/v2/helpers/GoogleSheets.types';

export let startingRow = 1;

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
				type: 'string',
				default: '10',
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
			);

			if (operationResult.length === 0 || operationResult[0] === undefined) {
				startingRow = 1;
				return [];
			}

			startingRow = (operationResult[0].json.row_number as number) + 1;

			let rowsLeft;

			try {
				rowsLeft = await getRowsLeftFilteredResults.call(
					this,
					googleSheetInstance,
					googleSheet.title,
					startingRow,
				);
			} catch (e) {
				// We want to prevent altering too much of the GSheets codebase
				// This is a low invasive way of checking if a column
				// which is a filter property is no longer in the sheet

				// tbh -- can also use operationResult??
				if (/^The column "[a-zA-Z]+" could not be found$/.test(e.message)) {
					rowsLeft = 0;
				} else {
					throw e;
				}
			}

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
			const inputData = this.getInputData();

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
