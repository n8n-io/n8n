import { isWorkflowNodeTaskPayload } from '../workflow-node-task-payload';

describe('isWorkflowNodeTaskPayload', () => {
	test('accepts a payload with workflowId and nodeId', () => {
		expect(isWorkflowNodeTaskPayload({ workflowId: 'wf-1', nodeId: 'node-1' })).toBe(true);
	});

	test.each([
		['empty payload', {}],
		['missing nodeId', { workflowId: 'wf-1' }],
		['missing workflowId', { nodeId: 'node-1' }],
		['empty workflowId', { workflowId: '', nodeId: 'node-1' }],
		['empty nodeId', { workflowId: 'wf-1', nodeId: '' }],
		['non-string ids', { workflowId: 42, nodeId: true }],
	])('rejects %s', (_name, payload) => {
		expect(isWorkflowNodeTaskPayload(payload)).toBe(false);
	});
});
