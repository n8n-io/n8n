import { isRecord } from '@mcp-apps/utils/guards';

export function readJsonMessage(data: unknown): Record<string, unknown> | undefined {
	if (typeof data !== 'string' || !data.includes('"command"')) return undefined;

	try {
		const parsed: unknown = JSON.parse(data);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}
