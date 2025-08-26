import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	ResourceMapperField,
	ResourceMapperFields,
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
		};
	});

	const paginationToken = results.length === take ? `${skip + take}` : undefined;

	return {
		results,
		paginationToken,
	};
}

export async function getDataTableColumns(this: ILoadOptionsFunctions) {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased-id, n8n-nodes-base/node-param-display-name-miscased
	const returnData: INodePropertyOptions[] = [{ name: 'id - (string)', value: 'id' }];
	const proxy = await getDataTableProxyLoadOptions(this);
	const columns = await proxy.getColumns();
	for (const column of columns) {
		returnData.push({
			name: `${column.name} - (${column.type})`,
			value: column.name,
		});
	}
	return returnData;
}

export async function getDataTables(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const proxy = await getDataTableProxyLoadOptions(this);
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
