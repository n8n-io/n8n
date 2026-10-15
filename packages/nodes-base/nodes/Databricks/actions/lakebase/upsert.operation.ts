import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lakebaseApiRequest } from '../../transport';
import { quotePostgrestComponent } from './conditions';
import { resolveLakebaseTableUrl } from './helpers';
import { columnsPresentInTable, columnsTheUserSet } from './mapping';

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const url = await resolveLakebaseTableUrl(this, i);

	// The property default carries no matchingColumns key, so a node built from
	// JSON would throw on a read without a fallback
	const matchingColumns = this.getNodeParameter('columns.matchingColumns', i, []) as string[];
	const mappingMode = this.getNodeParameter('columns.mappingMode', i) as string;
	// Mapped nulls are dropped, as in Update: on the merge path they would blank
	// columns the user never touched. An auto-mapped item keeps its nulls, which
	// are the user's own data.
	const row =
		mappingMode === 'autoMapInputData'
			? columnsPresentInTable(this, i)
			: columnsTheUserSet(
					(this.getNodeParameter('columns.value', i, {}) as IDataObject | null) ?? {},
				);

	if (matchingColumns.length === 0) {
		throw new NodeOperationError(this.getNode(), 'Select a column to match on', {
			itemIndex: i,
			description: 'The node needs a column to decide whether the row is already there.',
		});
	}

	// A null match column never conflicts, because Postgres counts two nulls as
	// different, so the upsert would quietly insert a duplicate every run. Own
	// properties only: a column named after one of Object's would read through.
	const missing = matchingColumns.filter(
		(column) => !Object.hasOwn(row, column) || row[column] === null,
	);
	if (missing.length > 0) {
		throw new NodeOperationError(
			this.getNode(),
			`The column to match on has no value: ${missing.join(', ')}`,
			{
				itemIndex: i,
				description:
					'Give every matching column a value, so the node can tell an insert from an update.',
			},
		);
	}

	const response = await lakebaseApiRequest(this, {
		method: 'POST',
		url,
		// Quoted, as everywhere else a column name reaches the query string: the
		// parser reads an unquoted name only as far as its first reserved character.
		qs: { on_conflict: matchingColumns.map(quotePostgrestComponent).join(',') },
		// Unlike Update, the match columns stay in the body: ON CONFLICT reads them
		// from the row being inserted.
		body: row,
		json: true,
		headers: {
			Accept: 'application/json',
			Prefer: 'resolution=merge-duplicates,return=representation',
		},
	});

	// An upsert always writes its row, so an empty answer means the project does
	// not honour `return=representation`, not that nothing happened.
	const written = Array.isArray(response) ? (response as IDataObject[]) : [];
	if (written.length === 0) return [{ json: { success: true }, pairedItem: { item: i } }];

	return written.map((writtenRow) => ({ json: writtenRow, pairedItem: { item: i } }));
}
