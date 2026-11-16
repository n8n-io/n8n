import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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
 * Offset paging needs a total order, otherwise a row can arrive twice or not at
 * all. A user sort is not necessarily unique, so the primary key goes on the end
 * as a tie-breaker rather than only when no sort was set. Best effort: a table
 * without one, or a project that does not serve the schema document, still pages.
 */
async function primaryKeyColumns(context: IExecuteFunctions, i: number): Promise<string[]> {
	try {
		const schemaUrl = await resolveLakebaseSchemaUrl(context, i);
		const table = context.getNodeParameter('lakebaseTable', i, '', {
			extractValue: true,
		}) as string;
		const columns = await fetchLakebaseColumns(context, schemaUrl, table);
		return columns.filter((column) => column.isPrimaryKey).map((column) => column.name);
	} catch {
		return [];
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
	if (returnAll || limit > LAKEBASE_PAGE_SIZE) {
		const alreadySorted = new Set(
			sort.filter((rule) => rule.column).map((rule) => String(rule.column)),
		);
		const tieBreakers = (await primaryKeyColumns(this, i))
			.filter((name) => !alreadySorted.has(name))
			.map((name) => `${quotePostgrestComponent(name)}.asc`);
		if (tieBreakers.length > 0) {
			qs.order = [qs.order, ...tieBreakers].filter(Boolean).join(',');
		}
	}

	const rows: IDataObject[] = [];

	// A project caps how many rows one response may carry, so a short page does not
	// have to be the last one. Only once the API has filled a request can a shorter
	// answer be read as the end of the table.
	let apiHasFilledAPage = false;
	let reachedTheEnd = false;

	for (let page = 0; page < LAKEBASE_MAX_PAGES; page++) {
		const requested = returnAll
			? LAKEBASE_PAGE_SIZE
			: Math.min(limit - rows.length, LAKEBASE_PAGE_SIZE);
		if (requested <= 0) {
			reachedTheEnd = true;
			break;
		}

		const response = await lakebaseApiRequest(this, {
			method: 'GET',
			url,
			qs: { ...qs, limit: requested, offset: rows.length },
			headers: { Accept: 'application/json' },
			json: true,
		});

		const batch = Array.isArray(response) ? (response as IDataObject[]) : [];
		rows.push(...batch);
		if (batch.length === 0) {
			reachedTheEnd = true;
			break;
		}

		if (batch.length >= requested) apiHasFilledAPage = true;
		else if (apiHasFilledAPage) {
			reachedTheEnd = true;
			break;
		}

		if (!returnAll && rows.length >= limit) {
			reachedTheEnd = true;
			break;
		}
	}

	// Handing back part of the table as though it were all of it would be read as the
	// table being that size, so stop instead of truncating in silence.
	if (!reachedTheEnd) {
		throw new NodeOperationError(
			this.getNode(),
			`The table holds more rows than one run can read (${LAKEBASE_MAX_PAGES * LAKEBASE_PAGE_SIZE})`,
			{
				itemIndex: i,
				description:
					'Narrow the result with a condition under Select Rows, or turn off Return All and set a Limit.',
			},
		);
	}

	return rows.map((row) => ({ json: row, pairedItem: { item: i } }));
}
