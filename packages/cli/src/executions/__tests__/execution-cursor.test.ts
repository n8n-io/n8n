import {
	encodeCursorForId,
	encodeExecutionCursor,
	parseExecutionCursor,
} from '@/executions/execution-cursor';

const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

describe('parseExecutionCursor', () => {
	it('returns no cursor when the caller asks for the first page', () => {
		expect(parseExecutionCursor(undefined)).toBeUndefined();
	});

	it('rejects a cursor that carries no position', () => {
		const encoded = Buffer.from(JSON.stringify({ version: 1 })).toString('base64url');

		expect(() => parseExecutionCursor(encoded)).toThrow('Invalid execution cursor');
	});

	it('rejects a cursor that carries a non-numeric id', () => {
		const encoded = Buffer.from(JSON.stringify({ version: 1, v1: V2_EXECUTION_ID })).toString(
			'base64url',
		);

		expect(() => parseExecutionCursor(encoded)).toThrow('Invalid execution cursor');
	});

	it('rejects a v2 position that is not a UUID', () => {
		const encoded = Buffer.from(JSON.stringify({ version: 1, v2: '123' })).toString('base64url');

		expect(() => parseExecutionCursor(encoded)).toThrow('Invalid execution cursor');
	});

	it('rejects a valid v2 position, which nothing can page by yet', () => {
		const encoded = encodeExecutionCursor(V2_EXECUTION_ID);

		expect(() => parseExecutionCursor(encoded)).toThrow('Unsupported execution cursor');
	});

	it('rejects a cursor that carries both positions', () => {
		const encoded = Buffer.from(
			JSON.stringify({ version: 1, v1: '123', v2: V2_EXECUTION_ID }),
		).toString('base64url');

		expect(() => parseExecutionCursor(encoded)).toThrow('Invalid execution cursor');
	});
});

describe('encodeExecutionCursor', () => {
	it('puts an engine 2.0 ID in the v2 position', () => {
		const encoded = encodeExecutionCursor(V2_EXECUTION_ID);
		const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

		expect(decoded).toEqual({ version: 1, v2: V2_EXECUTION_ID });
	});

	it('puts an engine 1.0 ID in the v1 position', () => {
		const encoded = encodeExecutionCursor('123');
		const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));

		expect(decoded).toEqual({ version: 1, v1: '123' });
	});
});

describe('encodeCursorForId', () => {
	it('round-trips a v1 execution id through parseExecutionCursor', () => {
		const encoded = encodeCursorForId('123');

		expect(encoded).not.toBeNull();
		expect(parseExecutionCursor(encoded ?? undefined)).toBe('123');
	});

	it('returns null for an engine 2.0 (v2) execution id', () => {
		expect(encodeCursorForId(V2_EXECUTION_ID)).toBeNull();
	});
});
