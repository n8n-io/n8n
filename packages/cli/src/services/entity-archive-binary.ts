import { binaryColumnType } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';

export const BINARY_ENCODINGS = ['buffer', 'base64'] as const;
export type BinaryEncoding = (typeof BINARY_ENCODINGS)[number];

const MiB = 1024 * 1024;

export const MAX_BINARY_VALUE_BYTES: Record<BinaryEncoding, number> = {
	buffer: 64 * MiB,
	base64: 200 * MiB,
};

export function encodeBinaryValues(
	row: Record<string, unknown>,
	encoding: BinaryEncoding,
): Record<string, unknown> {
	return encoding === 'base64'
		? Object.fromEntries(
				Object.entries(row).map(([key, value]) => [
					key,
					Buffer.isBuffer(value) ? value.toString('base64') : value,
				]),
			)
		: row;
}

/** The bytes of an archived binary value, written as base64 or as a serialised Buffer. */
function binaryValue(value: unknown): unknown {
	return typeof value === 'string'
		? Buffer.from(value, 'base64')
		: isRecord(value) && value.type === 'Buffer' && Array.isArray(value.data)
			? Buffer.from(value.data)
			: value;
}

export function restoreBinaryColumns(
	entity: Record<string, unknown>,
	metadata: { columns: Array<{ databaseName: string; type: unknown }> },
): Record<string, unknown> {
	const restored = { ...entity };
	for (const column of metadata.columns.filter(({ type }) => type === binaryColumnType)) {
		restored[column.databaseName] = binaryValue(restored[column.databaseName]);
	}
	return restored;
}
