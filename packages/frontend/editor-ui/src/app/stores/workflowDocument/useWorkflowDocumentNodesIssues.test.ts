import { describe, it, expect } from 'vitest';
import { computed } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import type { INodeConnections } from 'n8n-workflow';
import {
	useWorkflowDocumentNodesIssues,
	type WorkflowDocumentNodesIssuesDeps,
} from './useWorkflowDocumentNodesIssues';

const connectedNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({ name: 'Node', ...overrides }) as INodeUi;

const hasConnections: () => INodeConnections = () => ({
	main: [[{ node: 'Other', type: 'main' as const, index: 0 }]],
});
const noConnections: () => INodeConnections = () => ({});

function createDeps(nodes: INodeUi[], connected = true): WorkflowDocumentNodesIssuesDeps {
	return {
		allNodes: computed(() => nodes),
		outgoingConnectionsByNodeName: connected ? hasConnections : noConnections,
		incomingConnectionsByNodeName: noConnections,
	};
}

describe('useWorkflowDocumentNodesIssues', () => {
	describe('hasNodeValidationIssues', () => {
		it('includes execution issues', () => {
			const node = connectedNode({ issues: { execution: true } });
			const { hasNodeValidationIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasNodeValidationIssues.value).toBe(true);
		});

		it('includes parameter issues', () => {
			const node = connectedNode({
				issues: { parameters: { param1: ['Missing value'] } },
			});
			const { hasNodeValidationIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasNodeValidationIssues.value).toBe(true);
		});
	});

	describe('hasPublishBlockingIssues', () => {
		it('does not count execution issues as publish-blocking', () => {
			const node = connectedNode({ issues: { execution: true } });
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(false);
		});

		it('counts parameter issues as publish-blocking', () => {
			const node = connectedNode({
				issues: { parameters: { param1: ['Missing value'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('counts credential issues as publish-blocking', () => {
			const node = connectedNode({
				issues: { credentials: { cred1: ['Not set'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('blocks on parameter issues even when execution issues are also present', () => {
			const node = connectedNode({
				issues: { execution: true, parameters: { param1: ['Missing value'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});
	});
});
