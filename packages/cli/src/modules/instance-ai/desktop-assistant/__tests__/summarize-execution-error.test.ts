import type { ExecutionError, IRunExecutionData } from 'n8n-workflow';

import { summarizeExecutionError } from '../desktop-assistant.helpers';

/** Build minimal run data carrying a top-level error and/or lastNodeExecuted. */
function runData(resultData: Partial<IRunExecutionData['resultData']>): IRunExecutionData {
	return { resultData: { runData: {}, ...resultData } } as unknown as IRunExecutionData;
}

/** A node-scoped error (NodeApiError/NodeOperationError carry `node`). */
function nodeError(message: string, nodeName: string, description?: string): ExecutionError {
	return { message, description, node: { name: nodeName } } as unknown as ExecutionError;
}

describe('summarizeExecutionError', () => {
	test('prefixes the failing node name onto the error message', () => {
		const data = runData({ error: nodeError('Authorization failed', 'Dropbox') });
		expect(summarizeExecutionError(data)).toEqual({
			node: 'Dropbox',
			message: 'Dropbox: Authorization failed',
		});
	});

	test('falls back to the error description when there is no message', () => {
		const data = runData({ error: nodeError('', 'HTTP Request', 'Connection refused') });
		expect(summarizeExecutionError(data)).toEqual({
			node: 'HTTP Request',
			message: 'HTTP Request: Connection refused',
		});
	});

	test('uses lastNodeExecuted when the error carries no node', () => {
		const data = runData({
			error: { message: 'Something broke' } as unknown as ExecutionError,
			lastNodeExecuted: 'Set',
		});
		expect(summarizeExecutionError(data)).toEqual({ node: 'Set', message: 'Set: Something broke' });
	});

	test('returns a node-only phrasing when there is a node but no message', () => {
		const data = runData({ lastNodeExecuted: 'Code' });
		expect(summarizeExecutionError(data)).toEqual({
			node: 'Code',
			message: 'Problem in node ‘Code’',
		});
	});

	test('returns no message when there is neither error nor node', () => {
		expect(summarizeExecutionError(runData({}))).toEqual({ node: undefined, message: undefined });
		expect(summarizeExecutionError(undefined)).toEqual({ node: undefined, message: undefined });
	});

	test('collapses whitespace and truncates a long message to one line', () => {
		const long = `line one\n   line two ${'x'.repeat(200)}`;
		const { message } = summarizeExecutionError(
			runData({ error: { message: long } as unknown as ExecutionError }),
		);
		expect(message).not.toContain('\n');
		expect(message).not.toMatch(/ {2,}/);
		expect(message?.length).toBeLessThanOrEqual(140);
		expect(message?.endsWith('…')).toBe(true);
	});
});
