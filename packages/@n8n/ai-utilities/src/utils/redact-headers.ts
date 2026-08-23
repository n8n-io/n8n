import type { SerializedFields } from '@langchain/core/dist/load/map_keys';
import type { SerializedNotImplemented, SerializedSecret } from '@langchain/core/load/serializable';
import { isRecord } from '@n8n/utils/is-record';

type SerializedOptions = SerializedSecret | SerializedNotImplemented | SerializedFields;

const REDACTED_HEADER_VALUE = '**********';

const HEADER_CONTAINER_KEYS = ['defaultheaders', 'headers'];

const ALWAYS_REDACTED_HEADERS = ['authorization', 'x-api-key', 'api-key', 'cookie'];

function maskHeaderContainer(
	headers: Record<string, unknown>,
	lowerHeaderNames: string[],
): Record<string, unknown> {
	const masked = { ...headers };
	let changed = false;
	for (const key of Object.keys(headers)) {
		const lowerKey = key.toLowerCase();
		if (lowerHeaderNames.includes(lowerKey) || ALWAYS_REDACTED_HEADERS.includes(lowerKey)) {
			masked[key] = REDACTED_HEADER_VALUE;
			changed = true;
		}
	}
	return changed ? masked : headers;
}

function redactValue(value: unknown, lowerHeaderNames: string[]): unknown {
	if (Array.isArray(value)) {
		let result: unknown[] | undefined;
		value.forEach((item, index) => {
			const masked = redactValue(item, lowerHeaderNames);
			if (masked !== item) {
				result = result ?? [...value];
				result[index] = masked;
			}
		});
		return result ?? value;
	}

	if (!isRecord(value)) return value;

	let result: Record<string, unknown> | undefined;
	for (const [key, child] of Object.entries(value)) {
		const masked =
			HEADER_CONTAINER_KEYS.includes(key.toLowerCase()) && isRecord(child)
				? maskHeaderContainer(child, lowerHeaderNames)
				: redactValue(child, lowerHeaderNames);
		if (masked !== child) {
			result = result ?? { ...value };
			result[key] = masked;
		}
	}
	return result ?? value;
}

export function redactHeaderValues(
	options: SerializedOptions,
	headerNames: string[],
): SerializedOptions {
	const redacted = redactValue(
		options,
		headerNames.map((name) => name.toLowerCase()),
	);
	return isRecord(redacted) ? redacted : options;
}
