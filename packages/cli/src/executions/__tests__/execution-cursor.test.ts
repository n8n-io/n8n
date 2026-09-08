import {
	encodeCursorForRow,
	parseExecutionCursor,
	positionOf,
} from '@/executions/execution-cursor';

const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

describe('parseExecutionCursor', () => {
	it('returns no cursor when the caller asks for the first page', () => {
		expect(parseExecutionCursor(undefined)).toBeUndefined();
		expect(positionOf(parseExecutionCursor(undefined))).toBeUndefined();
	});

	it('rejects a cursor that carries no position', () => {
		const encoded = Buffer.from(JSON.stringify({ version: 1 })).toString('base64url');

		expect(() => parseExecutionCursor(encoded)).toThrow('Invalid execution cursor');
	});
});

describe('encodeCursorForRow', () => {
	it('round-trips a v1 execution row through parseExecutionCursor', () => {
		const row = {
			id: '123',
			startedAt: new Date('2024-01-01T00:00:00.000Z'),
			createdAt: new Date(),
		};

		const encoded = encodeCursorForRow(row);

		expect(encoded).not.toBeNull();
		expect(positionOf(parseExecutionCursor(encoded ?? undefined))).toEqual({
			timestamp: '2024-01-01T00:00:00.000Z',
			id: '123',
		});
	});

	it('returns null for an engine 2.0 (v2) execution row', () => {
		const row = { id: V2_EXECUTION_ID, startedAt: new Date(), createdAt: new Date() };

		expect(encodeCursorForRow(row)).toBeNull();
	});
});
