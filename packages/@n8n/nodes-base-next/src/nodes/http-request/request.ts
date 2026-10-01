import { isRecord, record, str } from '@n8n/node-sdk';

/** An array body becomes one item per element; any other body becomes one item. */
export function toItems(body: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(body)) return body.map((entry) => (isRecord(entry) ? entry : { data: entry }));
	return [isRecord(body) ? body : { data: body }];
}

export const common = {
	url: str().hint('Full URL; never URL-encode an expression'),
	query: record(str()).hint('Never put secrets here; attach a credential').optional(),
	headers: record(str()).hint('Never put secrets here; attach a credential').optional(),
};
