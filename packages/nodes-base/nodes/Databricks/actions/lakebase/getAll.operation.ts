import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { LAKEBASE_MAX_PAGES, LAKEBASE_PAGE_SIZE } from '../../constants';
import { lakebaseApiRequest } from '../../transport';
import {
	buildLakebaseQuery,
	quotePostgrestComponent,
	type LakebaseSortRule,
	type LakebaseWhereRule,
} from './conditions';
import { resolveLakebaseSchemaUrl, resolveLakebaseTableUrl } from './helpers';
import { fetchLakebaseColumns } from './schema';

/**
 * Offset paging needs a stable order, otherwise a row can arrive twice or not at
 * all. When the user set no sort rule, order by the primary key instead. Best
 * effort: a table without one, or a project that does not serve the schema
 * document, still pages.
 */
async function stableOrderFallback(
	context: IExecuteFunctions,
	i: number,
): Promise<string | undefined> {
	try {
		const schemaUrl = await resolveLakebaseSchemaUrl(context, i);
		const table = context.getNodeParameter('lakebaseTable', i, '', {
			extractValue: true,
		}) as string;
		const primaryKeys = (await fetchLakebaseColumns(context, schemaUrl, table)).filter(
			(column) => column.isPrimaryKey,
		);
		if (primaryKeys.length === 0) return undefined;

		return primaryKeys.map((column) => `${quotePostgrestComponent(column.name)}.asc`).join(',');
	} catch {
		return undefined;
	}
}

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseTableUrl(this, i);

	const where = this.getNodeParameter('where.values', i, []) as LakebaseWhereRule[];
	const sort = this.getNodeParameter('sort.values', i, []) as LakebaseSortRule[];
	const outputColumns = this.getNodeParameter('options.outputColumns', i, []) as string[];
	const combineConditions = this.getNodeParameter('combineConditions', i, 'AND') as 'AND' | 'OR';
	const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;

	const qs = buildLakebaseQuery({ where, combineConditions, sort, outputColumns });

	// Every page has to share one ordering, so this is settled before the first request
	if (qs.order === undefined && (returnAll || limit > LAKEBASE_PAGE_SIZE)) {
		const order = await stableOrderFallback(this, i);
		if (order) qs.order = order;
	}

	const rows: IDataObject[] = [];

	for (let page = 0; page < LAKEBASE_MAX_PAGES; page++) {
		const pageSize = returnAll
			? LAKEBASE_PAGE_SIZE
			: Math.min(limit - rows.length, LAKEBASE_PAGE_SIZE);
		if (pageSize <= 0) break;

		const response = await lakebaseApiRequest(this, {
			method: 'GET',
			url,
			qs: { ...qs, limit: pageSize, offset: rows.length },
			headers: { Accept: 'application/json' },
			json: true,
		});

		const batch = Array.isArray(response) ? (response as IDataObject[]) : [];
		rows.push(...batch);

		// A short page is the last page
		if (batch.length < pageSize) break;
		if (!returnAll && rows.length >= limit) break;
	}

	return rows.map((row) => ({ json: row, pairedItem: { item: i } }));
}
