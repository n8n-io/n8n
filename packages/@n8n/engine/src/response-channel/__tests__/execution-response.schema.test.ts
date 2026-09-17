import { describe, expect, it } from 'vitest';

import { executionResponseSchema } from '../execution-response.schema';

const ended = (overrides: Record<string, unknown> = {}) => ({
	type: 'ended',
	executionId: 'exec-1',
	workflowId: 'wf-1',
	status: 'completed',
	lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: [[{ json: { a: 1 } }]] },
	...overrides,
});

describe('executionResponseSchema', () => {
	it('accepts an ended response', () => {
		expect(executionResponseSchema.parse(ended())).toMatchObject({
			type: 'ended',
			lastStep: { outputs: [[{ json: { a: 1 } }]] },
		});
	});

	it('accepts a step that produced nothing', () => {
		const parsed = executionResponseSchema.parse(
			ended({
				status: 'failed',
				lastStep: {
					nodeId: 'a',
					nodeName: 'A',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);

		expect(parsed.lastStep).toEqual({
			nodeId: 'a',
			nodeName: 'A',
			status: 'failed',
			outputs: null,
			error: { name: 'NodeOperationError', message: 'it broke' },
		});
	});

	it.each([
		['an unknown type', { ...ended(), type: 'started' }],
		['a missing execution id', ended({ executionId: '' })],
		['a run status no caller can act on', ended({ status: 'running' })],
		[
			'a step status the engine does not use',
			ended({ lastStep: { nodeId: 'a', nodeName: 'A', status: 'paused', outputs: null } }),
		],
		[
			'a step that has not settled',
			ended({ lastStep: { nodeId: 'a', nodeName: 'A', status: 'running', outputs: null } }),
		],
		[
			'outputs that are not slots',
			ended({ lastStep: { nodeId: 'a', nodeName: 'A', status: 'completed', outputs: 1 } }),
		],
	])('rejects %s', (_case, response) => {
		expect(executionResponseSchema.safeParse(response).success).toBe(false);
	});

	it('drops what the wire shape does not define', () => {
		const parsed = executionResponseSchema.parse({ ...ended(), extra: 'ignored' });

		expect(parsed).not.toHaveProperty('extra');
	});
});
