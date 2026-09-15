import { isRecord } from '@n8n/utils/is-record';

export function readJsonMessage(data: unknown): Record<string, unknown> | undefined {
	if (typeof data !== 'string' || !data.includes('"command"')) return undefined;

	try {
		const parsed: unknown = JSON.parse(data);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}
