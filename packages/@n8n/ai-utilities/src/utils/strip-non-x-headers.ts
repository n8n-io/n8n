import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject } from 'n8n-workflow';

export function stripNonXHeaders(error: IDataObject | Error): void {
	if (!Object.prototype.hasOwnProperty.call(error, 'headers')) return;

	const headers: unknown = Reflect.get(error, 'headers');
	if (!isRecord(headers)) return;

	for (const key of Object.keys(headers)) {
		if (!key.toLowerCase().startsWith('x-')) delete headers[key];
	}
}
