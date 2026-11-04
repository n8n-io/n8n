import { describe, expect, it } from 'vitest';

import { normalizeExecuteWorkflowTriggers } from '../normalize-execute-workflow-trigger';

const trigger = (parameters: Record<string, unknown>, typeVersion = 1.1) => ({
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion,
	parameters,
});

describe('normalizeExecuteWorkflowTriggers', () => {
	it.each([1.1, 1.2])('defaults empty params to passthrough, v%s', (version) => {
		const [node] = normalizeExecuteWorkflowTriggers([trigger({}, version)]);
		expect(node.parameters).toEqual({ inputSource: 'passthrough' });
	});

	it('keeps declared schema', () => {
		const params = { inputSource: 'workflowInputs', workflowInputs: { values: [{ name: 'a' }] } };
		const [node] = normalizeExecuteWorkflowTriggers([trigger(params)]);
		expect(node.parameters).toEqual(params);
	});

	it('keeps explicit inputSource', () => {
		const [node] = normalizeExecuteWorkflowTriggers([trigger({ inputSource: 'jsonExample' })]);
		expect(node.parameters).toEqual({ inputSource: 'jsonExample' });
	});

	it('ignores other nodes', () => {
		const code = { type: 'n8n-nodes-base.code', typeVersion: 2, parameters: {} };
		expect(normalizeExecuteWorkflowTriggers([code])).toEqual([code]);
	});
});
