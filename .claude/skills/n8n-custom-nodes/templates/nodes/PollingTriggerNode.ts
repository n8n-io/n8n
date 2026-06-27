/**
 * TEMPLATE: Polling Trigger Node
 *
 * Periodically polls an API for new data. Uses the poll() method which is
 * called at intervals configured by the user in n8n's trigger settings.
 * State is persisted across polls using getWorkflowStaticData().
 *
 * Key behavior:
 *   - polling: true in description enables polling mode
 *   - poll() returns INodeExecutionData[][] or null (no new data)
 *   - getWorkflowStaticData('node') persists state between polls
 *   - getMode() returns 'manual' during test runs (fetch limited data)
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service class name (PascalCase)
 *   - __serviceName__     → Your service internal name (camelCase)
 *   - __serviceNameApi__  → Your credential name (camelCase)
 *   - __servicename__     → Icon filename (lowercase)
 */
import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { __serviceName__ApiRequest } from './GenericFunctions';

interface WorkflowStaticData {
	lastTimestamp?: string;
	lastId?: string;
	possibleDuplicates?: string[];
}

export class __ServiceName__Trigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: '__ServiceName__ Trigger',
		name: '__serviceName__Trigger',
		icon: 'file:__servicename__.svg',
		group: ['trigger'],
		version: 1,
		description: 'Polls __ServiceName__ for new events at regular intervals',
		subtitle: '={{"__ServiceName__ Trigger"}}',
		defaults: {
			name: '__ServiceName__ Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: '__serviceNameApi__',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				default: 'newItem',
				options: [
					{
						name: 'New Item',
						value: 'newItem',
						description: 'Trigger when a new item is created',
					},
					{
						name: 'Updated Item',
						value: 'updatedItem',
						description: 'Trigger when an item is updated',
					},
				],
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Active', value: 'active' },
							{ name: 'Archived', value: 'archived' },
							{ name: 'All', value: 'all' },
						],
						default: 'all',
					},
					{
						displayName: 'Category Name or ID',
						name: 'categoryId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getCategories',
						},
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getCategories(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const response = (await __serviceName__ApiRequest.call(
					this,
					'GET',
					'/categories',
				)) as Array<{ id: string; name: string }>;

				return response.map((cat) => ({
					name: cat.name,
					value: cat.id,
				}));
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const staticData = this.getWorkflowStaticData('node') as WorkflowStaticData;
		const event = this.getNodeParameter('event') as string;
		const filters = this.getNodeParameter('filters', {}) as IDataObject;
		const simple = this.getNodeParameter('simple') as boolean;

		const now = new Date().toISOString();

		// ---- Manual mode: return small sample ----
		if (this.getMode() === 'manual') {
			const qs: IDataObject = { limit: 1, ...filters };

			const response = (await __serviceName__ApiRequest.call(
				this,
				'GET',
				'/items',
				{},
				qs,
			)) as IDataObject;

			const items = (response.data as IDataObject[]) || [];
			if (!items.length) return null;

			if (simple) {
				return [this.helpers.returnJsonArray(items.map(simplifyItem))];
			}
			return [this.helpers.returnJsonArray(items)];
		}

		// ---- Production mode: fetch since last poll ----
		const since = staticData.lastTimestamp ?? now;
		const qs: IDataObject = {
			since,
			event,
			sort: 'created_at',
			order: 'asc',
			...filters,
		};

		let allItems: IDataObject[];
		try {
			const response = (await __serviceName__ApiRequest.call(
				this,
				'GET',
				'/items',
				{},
				qs,
			)) as IDataObject;

			allItems = (response.data as IDataObject[]) || [];
		} catch (error) {
			// On error in production, log and return null to retry next cycle
			const workflow = this.getWorkflow();
			const node = this.getNode();
			this.logger.error(
				`Error in '${node.name}' node in workflow '${workflow.id}': ${(error as Error).message}`,
				{ node: node.name, workflowId: workflow.id, error },
			);
			return null;
		}

		if (!allItems.length) return null;

		// ---- Deduplication ----
		const previousDuplicates = new Set(staticData.possibleDuplicates ?? []);
		const filteredItems = allItems.filter(
			(item) => !previousDuplicates.has(item.id as string),
		);

		// Track items that might appear again on next poll (same timestamp)
		const lastItemTimestamp = allItems[allItems.length - 1].created_at as string;
		staticData.possibleDuplicates = allItems
			.filter((item) => item.created_at === lastItemTimestamp)
			.map((item) => item.id as string);

		// Update timestamp for next poll
		staticData.lastTimestamp = lastItemTimestamp ?? since;

		if (!filteredItems.length) return null;

		if (simple) {
			return [this.helpers.returnJsonArray(filteredItems.map(simplifyItem))];
		}
		return [this.helpers.returnJsonArray(filteredItems)];
	}
}

/**
 * Simplify an API response item to only include essential fields.
 */
function simplifyItem(item: IDataObject): IDataObject {
	return {
		id: item.id,
		name: item.name,
		status: item.status,
		createdAt: item.created_at,
		updatedAt: item.updated_at,
	};
}
