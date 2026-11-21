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
import { triggerSourcePicker } from '../Evaluation/Description.node';
import { listSearch, loadOptions, credentialTest } from '../methods';
import {
	getGoogleSheet,
	getResults,
	getRowsLeft,
	getNumberOfRowsLeftFiltered,
	getSheet,
} from '../utils/evaluationTriggerUtils';
import {
	buildLangfuseRow,
	findLangfuseActiveItem,
	getAllLangfuseDatasetItems,
	getLangfuseDataset,
	parseLangfuseDatasetVersion,
	parseLangfuseOptions,
} from '../utils/langfuse';
import type { LangfuseRowState, LangfuseTriggerOptions } from '../utils/langfuse';

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
				...triggerSourcePicker,
				default: 'dataTable',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 4.7 } }] } },
			},
			{
				...triggerSourcePicker,
				default: 'googleSheets',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 4.6 } }] } },
			},
			{
				displayName:
					'Pulls a test dataset from a Google Sheet. The workflow will run once for each row, in sequence. Tips for wiring this node up <a href="https://docs.n8n.io/advanced-ai/evaluations/tips-and-common-issues/#combining-multiple-triggers">here</a>.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { source: ['googleSheets'] } },
			},
			{
				displayName: 'Credentials',
				name: 'credentials',
				type: 'credentials',
				default: '',
				displayOptions: { show: { source: ['googleSheets'] } },
			},
			{
				...authentication,
				displayOptions: { show: { source: ['googleSheets'] } },
			},
			{
				...document,
				displayName: 'Document Containing Dataset',
				hint: 'Example dataset format <a href="https://docs.google.com/spreadsheets/d/1vD_IdeFUg7sHsK9okL6Doy1rGOkWTnPJV3Dro4FBUsY/edit?gid=0#gid=0">here</a>',
				displayOptions: { show: { source: ['googleSheets'] } },
			},
			{
				...sheet,
				displayName: 'Sheet Containing Dataset',
				displayOptions: { show: { source: ['googleSheets'] } },
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
				displayName: 'Dataset',
				name: 'langfuseDataset',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: {
							searchListMethod: 'langfuseDatasetSearch',
							searchable: true,
						},
					},
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
					},
				],
				displayOptions: { show: { source: ['langfuse'] } },
			},
			{
				displayName: 'Dataset Version',
				name: 'langfuseDatasetVersion',
				type: 'string',
				default: '',
				placeholder: '2026-01-21T14:35:42Z',
				description:
					'Pin the dataset to its state at this time (ISO 8601, UTC). Leave empty for the latest version.',
				displayOptions: { show: { source: ['langfuse'] } },
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
			{ ...googleSheetFilters, displayOptions: { show: { source: ['googleSheets'] } } },
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
			{
				displayName: 'Options',
				name: 'langfuseOptions',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { source: ['langfuse'] } },
				options: [
					{
						displayName: 'Expected Output Field',
						name: 'expectedOutputField',
						type: 'string',
						default: 'expectedOutput',
						description:
							"Name of the field that holds the dataset item's expected output, for example 'criteria' if that is where grading criteria are stored",
					},
					{
						displayName: 'Flatten Input',
						name: 'flattenInput',
						type: 'boolean',
						default: true,
						description:
							'Whether to also expose the keys of an object input at the top level of each row',
					},
					{
						displayName: 'Include Metadata',
						name: 'includeMetadata',
						type: 'boolean',
						default: true,
						description: 'Whether to expose the dataset item metadata in each row',
					},
				],
			},
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
			{
				name: 'langfuseApi',
				required: true,
				displayOptions: {
					show: {
						source: ['langfuse'],
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
			const previousRunRowId = inputData?.[0]?.json?.row_id;

			let effectiveFilter = filter;
			if (typeof previousRunRowId === 'number' && previousRunRowsLeft !== 0) {
				effectiveFilter = {
					type: 'and',
					filters: [
						...filter.filters,
						{
							columnName: 'id',
							condition: 'gt',
							value: previousRunRowId,
						},
					],
				};
			}

			const { data, count } = await dataTableProxy.getManyRowsAndCount({
				skip: 0,
				take: 1,
				filter: effectiveFilter,
			});

			if (data.length === 0) {
				throw new NodeOperationError(this.getNode(), 'No row found');
			}

			// `count` is the number of rows still matching (current row included), so the
			// row limit has to be measured against the rows already consumed.
			const rowsLeft = Math.max(0, Math.min(count - 1, maxRows - currentIndex - 1));

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

		if (source === 'langfuse') {
			const maxRows = this.getNodeParameter('limitRows', 0, false)
				? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number)
				: MAX_ROWS;

			const datasetName = this.getNodeParameter('langfuseDataset', 0, undefined, {
				extractValue: true,
			}) as string;
			const version = parseLangfuseDatasetVersion(
				this.getNode(),
				this.getNodeParameter('langfuseDatasetVersion', 0, ''),
			);
			const options = parseLangfuseOptions(
				this.getNode(),
				this.getNodeParameter('langfuseOptions', 0, {}) as LangfuseTriggerOptions,
			);

			const carried =
				typeof previousRunRowNumber === 'number' && previousRunRowsLeft !== 0
					? (inputData?.[0]?.json?._langfuse as LangfuseRowState | undefined)
					: undefined;

			const sameDataset =
				carried?.datasetName === datasetName && typeof carried.datasetId === 'string';

			const previous = sameDataset ? carried : undefined;

			const rowNumber = previous ? (previousRunRowNumber as number) + 1 : 0;
			const start = typeof previous?.position === 'number' ? previous.position + 1 : rowNumber;
			const fetchedAt =
				typeof previous?.fetchedAt === 'string' ? previous.fetchedAt : new Date().toISOString();

			const dataset = previous
				? { id: previous.datasetId as string, name: previous.datasetName as string }
				: await getLangfuseDataset.call(this, datasetName);

			const requestVersion = version ?? fetchedAt;

			const current =
				rowNumber < maxRows
					? await findLangfuseActiveItem.call(this, {
							datasetName,
							version: requestVersion,
							start,
						})
					: null;

			if (!current) throw new NodeOperationError(this.getNode(), 'No row found');

			let rowsLeft = 0;

			if (rowNumber + 1 < maxRows && (current.totalItems ?? Infinity) > current.position + 1) {
				const next = await findLangfuseActiveItem.call(this, {
					datasetName,
					version: requestVersion,
					start: current.position + 1,
				});

				if (next) {
					rowsLeft = Math.max(
						1,
						Math.min((current.totalItems ?? Infinity) - next.position, maxRows - rowNumber - 1),
					);
				}
			}

			return [
				[
					{
						json: {
							...buildLangfuseRow({
								item: current.item,
								dataset,
								rowNumber,
								datasetVersion: version,
								fetchedAt,
								options,
								position: current.position,
							}),
							_rowsLeft: rowsLeft,
						},
					},
				],
			];
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
					} else if (source === 'langfuse') {
						const maxRows = this.getNodeParameter('limitRows', 0, false)
							? (this.getNodeParameter('maxRows', 0, MAX_ROWS) as number)
							: MAX_ROWS;

						const datasetName = this.getNodeParameter('langfuseDataset', 0, undefined, {
							extractValue: true,
						}) as string;
						const version = parseLangfuseDatasetVersion(
							this.getNode(),
							this.getNodeParameter('langfuseDatasetVersion', 0, ''),
						);
						const options = parseLangfuseOptions(
							this.getNode(),
							this.getNodeParameter('langfuseOptions', 0, {}) as LangfuseTriggerOptions,
						);

						const dataset = await getLangfuseDataset.call(this, datasetName);
						const fetchedAt = new Date().toISOString();
						const items = await getAllLangfuseDatasetItems.call(this, {
							datasetName,
							version: version ?? fetchedAt,
							maxItems: maxRows,
						});

						const result: INodeExecutionData[] = items.map((item, i) => ({
							json: buildLangfuseRow({
								item,
								dataset,
								rowNumber: i,
								datasetVersion: version,
								fetchedAt,
								options,
							}),
							pairedItem: { item: 0 },
						}));

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
