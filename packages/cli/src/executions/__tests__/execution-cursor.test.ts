import { encodeExecutionCursor, parseExecutionCursor } from '@/executions/execution-cursor';

const time = '2026-09-07T12:00:00.000Z';
const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

describe('parseExecutionCursor', () => {
	it('returns an empty cursor when the caller asks for the first page', () => {
		expect(parseExecutionCursor(undefined)).toEqual({ version: 1 });
	});

	it('round trips both positions', () => {
		const cursor = {
			version: 1 as const,
			v1: { id: '10', timestamp: time },
			v2: { id: V2_EXECUTION_ID, timestamp: time },
		};
		expect(parseExecutionCursor(encodeExecutionCursor(cursor))).toEqual(cursor);
	});

	it.each([
		'',
		'!',
		Buffer.from('{').toString('base64url'),
		Buffer.from(JSON.stringify({ version: 2 })).toString('base64url'),
		Buffer.from(
			JSON.stringify({ version: 1, v1: { id: V2_EXECUTION_ID, timestamp: time } }),
		).toString('base64url'),
		Buffer.from(JSON.stringify({ version: 1, v1: { id: '10' } })).toString('base64url'),
	])('rejects an invalid cursor %s', (cursor) => {
		expect(() => parseExecutionCursor(cursor)).toThrow('Invalid execution cursor');
	});
});
