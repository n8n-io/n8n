import { encodeCursorForId, parseExecutionCursor } from '@/executions/execution-cursor';

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
