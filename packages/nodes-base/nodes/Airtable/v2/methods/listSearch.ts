import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function baseSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	let qs;
	if (paginationToken) {
		qs = {
			offset: paginationToken,
		};
	}

	const response = await apiRequest.call(this, 'GET', 'meta/bases', undefined, qs);

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const base of response.bases || []) {
			if ((base.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: base.name as string,
					value: base.id as string,
					url: `https://airtable.com/${base.id}`,
				});
			}
		}

		return {
			results,
			paginationToken: response.offset,
		};
	} else {
		return {
			results: (response.bases || []).map((base: IDataObject) => ({
				name: base.name as string,
				value: base.id as string,
				url: `https://airtable.com/${base.id}`,
			})),
			paginationToken: response.offset,
		};
	}
}

export async function tableSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('base', undefined, {
		extractValue: true,
	}) as string;

	let qs;
	if (paginationToken) {
		qs = {
			offset: paginationToken,
		};
	}

	const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`, undefined, qs);

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const table of response.tables || []) {
			if ((table.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: table.name as string,
					value: table.id as string,
					url: `https://airtable.com/${baseId}/${table.id}`,
				});
			}
		}

		return {
			results,
			paginationToken: response.offset,
		};
	} else {
		return {
			results: (response.tables || []).map((table: IDataObject) => ({
				name: table.name as string,
				value: table.id as string,
				url: `https://airtable.com/${baseId}/${table.id}`,
			})),
			paginationToken: response.offset,
		};
	}
}

export async function viewSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const baseId = this.getNodeParameter('base', undefined, {
		extractValue: true,
	}) as string;

	const tableId = encodeURI(
		this.getNodeParameter('table', undefined, {
			extractValue: true,
		}) as string,
	);

	const response = await apiRequest.call(this, 'GET', `meta/bases/${baseId}/tables`);

	const tableData = ((response.tables as IDataObject[]) || []).find((table: IDataObject) => {
		return table.id === tableId;
	});

	if (!tableData) {
		throw new NodeOperationError(this.getNode(), 'Table information could not be found!', {
			level: 'warning',
		});
	}

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const view of (tableData.views as IDataObject[]) || []) {
			if ((view.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: view.name as string,
					value: view.id as string,
					url: `https://airtable.com/${baseId}/${tableId}/${view.id}`,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: ((tableData.views as IDataObject[]) || []).map((view) => ({
				name: view.name as string,
				value: view.id as string,
				url: `https://airtable.com/${baseId}/${tableId}/${view.id}`,
			})),
		};
	}
}
