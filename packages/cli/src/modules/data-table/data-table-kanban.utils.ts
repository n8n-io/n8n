import { DATA_TABLE_KANBAN_ORDER_LENGTH } from './data-table.types';

const MIN_ORDER = 0n;
const MAX_ORDER = (1n << BigInt(DATA_TABLE_KANBAN_ORDER_LENGTH * 4)) - 1n;

export class InvalidKanbanCursorError extends Error {}

export function encodeKanbanOrder(value: bigint): string {
	return value.toString(16).padStart(DATA_TABLE_KANBAN_ORDER_LENGTH, '0');
}

export function initialKanbanOrder(rowId: number): string {
	if (!Number.isSafeInteger(rowId) || rowId < 1) {
		throw new Error('Invalid Data Table row ID');
	}
	return encodeKanbanOrder(BigInt(rowId) << 64n);
}

export function decodeKanbanOrder(value: string): bigint {
	if (!new RegExp(`^[0-9a-f]{${DATA_TABLE_KANBAN_ORDER_LENGTH}}$`).test(value)) {
		throw new Error('Invalid Kanban order');
	}
	return BigInt(`0x${value}`);
}

/**
 * Returns ranks in descending order between the upper and lower bounds.
 */
export function allocateKanbanOrders(
	count: number,
	upperOrder: string | null,
	lowerOrder: string | null,
): string[] | null {
	if (count === 0) return [];

	const upper = upperOrder === null ? MAX_ORDER : decodeKanbanOrder(upperOrder);
	const lower = lowerOrder === null ? MIN_ORDER : decodeKanbanOrder(lowerOrder);
	const gap = upper - lower;
	const step = gap / BigInt(count + 1);
	if (step < 1n) return null;

	return Array.from({ length: count }, (_, index) =>
		encodeKanbanOrder(upper - step * BigInt(index + 1)),
	);
}

export function encodeKanbanCursor(order: string, id: number, generation: string): string {
	return Buffer.from(JSON.stringify({ order, id, generation }), 'utf8').toString('base64url');
}

export function decodeKanbanCursor(
	cursor: string,
	expectedGeneration: string,
): { order: string; id: number } {
	try {
		const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
		if (
			typeof value !== 'object' ||
			value === null ||
			!('order' in value) ||
			typeof value.order !== 'string' ||
			!('id' in value) ||
			typeof value.id !== 'number' ||
			!Number.isSafeInteger(value.id) ||
			!('generation' in value) ||
			value.generation !== expectedGeneration
		) {
			throw new Error();
		}
		decodeKanbanOrder(value.order);
		return { order: value.order, id: value.id };
	} catch {
		throw new InvalidKanbanCursorError('Invalid Kanban cursor');
	}
}
