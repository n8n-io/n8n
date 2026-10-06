import { t } from '@n8n/node-sdk';

/** A row: column names to values. The columns depend on the table. */
export const tableRow = t
	.record(t.jsonValue())
	.hint('Column names to values; the table defines them');
