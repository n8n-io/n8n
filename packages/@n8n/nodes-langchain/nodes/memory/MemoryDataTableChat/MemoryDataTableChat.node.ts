import { BufferWindowMemory } from '@langchain/classic/memory';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	INodeListSearchResult,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { DataTableChatMessageHistory } from './DataTableChatMessageHistory';
import { getSessionId } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import {
	sessionIdOption,
	sessionKeyProperty,
	contextWindowLengthProperty,
	expressionSessionKeyProperty,
} from '../descriptions';

export class MemoryDataTableChat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Data Table Chat Memory',
		name: 'memoryDataTableChat',
		icon: 'fa:table',
		iconColor: 'orange-red',
		group: ['transform'],
		version: [1, 1.1],
		description: 'Stores the chat history in a data table',
		defaults: {
			name: 'Data Table Chat Memory',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Memory'],
				Memory: ['Other memories'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiMemory],
		outputNames: ['Memory'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiAgent]),
			sessionIdOption,
			expressionSessionKeyProperty(1.1),
			sessionKeyProperty,
			{
				displayName: 'Data Table',
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
							searchListMethod: 'searchDataTables',
							searchable: true,
						},
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
									errorMessage: 'Not a valid data table ID',
								},
							},
						],
						placeholder: 'e.g. 123e4567-e89b-12d3-a456-426614174000',
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'e.g. chat_history',
					},
				],
				description:
					'The data table to store chat history in. Table must have columns: sessionId (string), type (string), message (string), and optionally metadata (string).',
			},
			{
				...contextWindowLengthProperty,
				displayOptions: { hide: { '@version': [{ _cnd: { lt: 1.1 } }] } },
			},
		],
	};

	methods = {
		listSearch: {
			async searchDataTables(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
				if (!this.helpers.getDataTableAggregateProxy) {
					throw new NodeOperationError(
						this.getNode(),
						'Data table module is not available. This node requires data tables to be enabled.',
					);
				}

				const aggregateProxy = await this.helpers.getDataTableAggregateProxy();
				const { data } = await aggregateProxy.getManyAndCount({ take: 100 });

				return {
					results: data.map((dt) => ({
						name: dt.name,
						value: dt.id,
						url: `/projects/${dt.projectId}/data-tables/${dt.id}`,
					})),
				};
			},
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		// Check data table module is available
		if (!this.helpers.getDataTableProxy) {
			throw new NodeOperationError(
				this.getNode(),
				'Data table module is not available. This node requires data tables to be enabled.',
			);
		}

		// Get parameters
		const dataTableId = this.getNodeParameter('dataTableId', itemIndex, '', {
			extractValue: true,
		}) as string;
		const sessionId = getSessionId(this, itemIndex);

		// Get data table proxy
		const dataTableProxy = await this.helpers.getDataTableProxy(dataTableId);

		// Create chat history
		const chatHistory = new DataTableChatMessageHistory({
			dataTableProxy,
			sessionId,
			node: this.getNode(),
		});

		// Get context window length (only available in v1.1+)
		const contextWindowLength =
			this.getNode().typeVersion >= 1.1
				? (this.getNodeParameter('contextWindowLength', itemIndex, 5) as number)
				: 5;

		// Create memory with context window
		const memory = new BufferWindowMemory({
			memoryKey: 'chat_history',
			chatHistory,
			returnMessages: true,
			inputKey: 'input',
			outputKey: 'output',
			k: contextWindowLength,
		});

		return {
			response: logWrapper(memory, this),
		};
	}
}
