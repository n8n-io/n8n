import {
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type INodePropertyOptions,
	type ResourceMapperField,
	type ResourceMapperFields,
} from 'n8n-workflow';

import { getDataTableAggregateProxy, getDataTableProxyLoadOptions } from './utils';

// @ADO-3904: Pagination here does not work until a filter is entered or removed, suspected bug in ResourceLocator
export async function tableSearch(
	this: ILoadOptionsFunctions,
	filterString?: string,
	prevPaginationToken?: string,
): Promise<INodeListSearchResult> {
	const proxy = await getDataTableAggregateProxy(this);

	const skip = prevPaginationToken === undefined ? 0 : parseInt(prevPaginationToken, 10);
	const take = 100;
	const filter = filterString === undefined ? {} : { filter: { name: filterString.toLowerCase() } };
	const result = await proxy.getManyAndCount({
		skip,
		take,
		...filter,
	});

	const results = result.data.map((row) => {
		return {
			name: row.name,
			value: row.id,
			url: `/projects/${proxy.getProjectId()}/datatables/${row.id}`,
		};
	});

	const paginationToken = results.length === take ? `${skip + take}` : undefined;

	return {
		results,
		paginationToken,
	};
}

export async function getDataTableColumns(this: ILoadOptionsFunctions) {
	const returnData: Array<INodePropertyOptions & { type: string }> = [
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id, n8n-nodes-base/node-param-display-name-miscased
		{ name: 'id (number)', value: 'id', type: 'number' },
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		{ name: 'createdAt (date)', value: 'createdAt', type: 'date' },
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
		{ name: 'updatedAt (date)', value: 'updatedAt', type: 'date' },
	];

	const proxy = await getDataTableProxyLoadOptions(this);
	if (!proxy) {
		return returnData;
	}

	const columns = await proxy.getColumns();
	for (const column of columns) {
		returnData.push({
			name: `${column.name} (${column.type})`,
			value: column.name,
			type: column.type,
		});
	}
	return returnData;
}

const systemColumns = [
	{ name: 'id', type: 'number' },
	{ name: 'createdAt', type: 'date' },
	{ name: 'updatedAt', type: 'date' },
] as const;

export async function getConditionsForColumn(this: ILoadOptionsFunctions) {
	const proxy = await getDataTableProxyLoadOptions(this);
	if (!proxy) {
		return [];
	}
	const keyName = this.getCurrentNodeParameter('&keyName') as string;

	const nullConditions: INodePropertyOptions[] = [
		{ name: 'Is Empty', value: 'isEmpty' },
		{ name: 'Is Not Empty', value: 'isNotEmpty' },
	];

	const equalsConditions: INodePropertyOptions[] = [
		{ name: 'Equals', value: 'eq' },
		{ name: 'Not Equals', value: 'neq' },
	];

	const booleanConditions: INodePropertyOptions[] = [
		{ name: 'Is True', value: 'isTrue' },
		{ name: 'Is False', value: 'isFalse' },
	];

	const comparableConditions: INodePropertyOptions[] = [
		{ name: 'Greater Than', value: 'gt' },
		{ name: 'Greater Than or Equal', value: 'gte' },
		{ name: 'Less Than', value: 'lt' },
		{ name: 'Less Than or Equal', value: 'lte' },
	];

	const stringConditions: INodePropertyOptions[] = [
		{ name: 'Contains (Case-Sensitive)', value: 'like' },
		{ name: 'Contains (Case-Insensitive)', value: 'ilike' },
	];

	const allConditions = [
		...nullConditions,
		...equalsConditions,
		...booleanConditions,
		...comparableConditions,
		...stringConditions,
	];

	// If no column is selected yet, return all conditions
	if (!keyName) {
		return allConditions;
	}

	// Get column type to determine available conditions
	const column =
		systemColumns.find((col) => col.name === keyName) ??
		(await proxy.getColumns()).find((col) => col.name === keyName);

	if (!column) {
		return [...equalsConditions, ...nullConditions];
	}

	const conditions: INodePropertyOptions[] = [];

	if (column.type === 'boolean') {
		conditions.push.apply(conditions, booleanConditions);
	}

	// String columns get LIKE operators
	if (column.type === 'string') {
		conditions.push.apply(conditions, equalsConditions);
		conditions.push.apply(conditions, stringConditions);
		conditions.push.apply(conditions, comparableConditions);
	}

	if (['number', 'date'].includes(column.type)) {
		conditions.push.apply(conditions, equalsConditions);
		conditions.push.apply(conditions, comparableConditions);
	}

	conditions.push.apply(conditions, nullConditions);

	return conditions;
}

export async function getDataTables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const proxy = await getDataTableProxyLoadOptions(this);
	if (!proxy) {
		return { fields: [] };
	}
	const result = await proxy.getColumns();

	const fields: ResourceMapperField[] = [];

	for (const field of result) {
		const type = field.type === 'date' ? 'dateTime' : field.type;

		fields.push({
			id: field.name,
			displayName: field.name,
			required: false,
			defaultMatch: false,
			display: true,
			type,
			readOnly: false,
			removed: false,
		});
	}

	return { fields };
}
