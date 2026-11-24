import { parse } from 'flatted';

import { parseFlattedAsync } from './flatted-async';

// 1 MB — below this, sync parse is fast enough
export const SIZE_THRESHOLD = 1 * 1024 * 1024;

/**
 * Parse a flatted JSON string, using async streaming for large payloads
 * and sync parsing for small ones.
 *
 * @param data - The flatted JSON string to parse
 * @returns The deserialized object
 */
export async function parseFlatted(data: string): Promise<unknown> {
	if (data.length < SIZE_THRESHOLD) {
		return parse(data);
	}
	return await parseFlattedAsync(data);
}
