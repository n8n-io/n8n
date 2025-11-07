/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	INodeExecutionData,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	getSelectFields as dataTableFilters,
	getSelectFilter as getDataTableFilter,
} from '../../DataTable/common/selectMany';
import { document, sheet } from '../../Google/Sheet/GoogleSheetsTrigger.node';
import { readFilter as googleSheetFilters } from '../../Google/Sheet/v2/actions/sheet/read.operation';
import { authentication } from '../../Google/Sheet/v2/actions/versionDescription';
import type { ILookupValues } from '../../Google/Sheet/v2/helpers/GoogleSheets.types';
import { sourcePicker } from '../Evaluation/Description.node';
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
		version: [4.6, 4.7],
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
				...sourcePicker,
				default: 'dataTable',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 4.7 } }] } },
			},
			{
				...sourcePicker,
				default: 'googleSheets',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 4.6 } }] } },
			},
			{
				displayName:
					'Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. Tips for wiring this node up <a href="https://docs.n8n.io/advanced-ai/evaluations/tips-and-common-issues/#combining-multiple-triggers">here</a>.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { hide: { source: ['dataTable'] } },
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: { hide: { source: ['dataTable'] } },
			},
			{
				...authentication,
				displayOptions: {
					hide: {
						source: ['dataTable'],
					},
				},
			},
			{
				...document,
				displayName: 'Document Containing Dataset',
				hint: 'Example dataset format <a href="https://docs.google.com/spreadsheets/d/1vD_IdeFUg7sHsK9okL6Doy1rGOkWTnPJV3Dro4FBUsY/edit?gid=0#gid=0">here</a>',
				displayOptions: { hide: { source: ['dataTable'] } },
			},
			{
				...sheet,
				displayName: 'Sheet Containing Dataset',
				displayOptions: { hide: { source: ['dataTable'] } },
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Data table',
				name: 'dataTableId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'dataTableSearch',
							searchable: true,
							skipCredentialsCheckInRLC: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
					},
				],
				displayOptions: { show: { source: ['dataTable'] } },
			},
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
			{ ...googleSheetFilters, displayOptions: { hide: { source: ['dataTable'] } } },
			{
				displayName: 'Filter Rows',
				name: 'filterRows',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether to filter rows to process',
				displayOptions: { show: { source: ['dataTable'] } },
			},
			...dataTableFilters({ show: { filterRows: [true] } }),
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

	methods = {
		loadOptions,
		listSearch,
		credentialTest,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputData = this.getInputData();

		const source = this.getNodeParameter('source', 0) as string;

		const previousRunRowNumber = inputData?.[0]?.json?.row_number;
		const previousRunRowsLeft = inputData?.[0]?.json?._rowsLeft;

		if (source === 'dataTable') {
			const maxRows = this.getNodeParameter('limitRows', 0, false)
				? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number)
				: MAX_ROWS;

			if (this.helpers.getDataTableProxy === undefined) {
				throw new NodeOperationError(
					this.getNode(),
					'Attempted to use Data table node but the module is disabled',
				);
			}

			const currentIndex =
				typeof previousRunRowNumber === 'number' && previousRunRowsLeft !== 0
					? previousRunRowNumber + 1
					: 0;

			const dataTableId = this.getNodeParameter('dataTableId', 0, undefined, {
				extractValue: true,
			}) as string;
			const dataTableProxy = await this.helpers.getDataTableProxy(dataTableId);

			const filter = await getDataTableFilter(this, 0);

			const { data, count } = await dataTableProxy.getManyRowsAndCount({
				skip: currentIndex,
				take: 1,
				filter,
			});

			if (data.length === 0) {
				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			const effectiveTotal = Math.min(count, maxRows);
			const rowsLeft = Math.max(0, effectiveTotal - (currentIndex + 1));

			const currentRow = {
				json: {
					...data[0],
					row_number: currentIndex,
					row_id: data[0].id,
					_rowsLeft: rowsLeft,
				},
			} satisfies INodeExecutionData;

			return [[currentRow]];
		} else if (source === 'googleSheets') {
			const maxRows = this.getNodeParameter('limitRows', 0, false)
				? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number) + 1
				: MAX_ROWS;

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

			const allRows = await getResults.call(
				this,
				[],
				googleSheetInstance,
				googleSheet,
				rangeOptions,
			);

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
				const currentRow = allRows.find(
					(row) => (row?.json?.row_number as number) === firstDataRow,
				);

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

		throw new NodeOperationError(this.getNode(), `Unknown source "${source}"`);
	}

	customOperations = {
		dataset: {
			async getRows(
				this: IExecuteFunctions,
			): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
				try {
					const source = this.getNodeParameter('source', 0) as string;
					if (source === 'dataTable') {
						const maxRows = this.getNodeParameter('limitRows', 0, false)
							? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number)
							: MAX_ROWS;

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

						const filter = await getDataTableFilter(this, 0);
						const { data } = await dataTableProxy.getManyRowsAndCount({
							skip: 0,
							take: maxRows,
							filter,
						});

						const result: INodeExecutionData[] = data.map((row, i) => ({
							json: {
								...row,
								row_id: row.id,
								row_number: i,
							},
							pairedItem: { item: 0 },
						}));

						return [result];
					} else if (source === 'googleSheets') {
						const maxRows = this.getNodeParameter('limitRows', 0, false)
							? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number) + 1
							: MAX_ROWS;

						const googleSheetInstance = getGoogleSheet.call(this);
						const googleSheet = await getSheet.call(this, googleSheetInstance);

						const results = await getResults.call(this, [], googleSheetInstance, googleSheet, {});
						const result = results.slice(0, maxRows - 1);

						return [result];
					}

					throw new NodeOperationError(this.getNode(), `Unknown source "${source}"`);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), error);
				}
			},
		},
	};
}
