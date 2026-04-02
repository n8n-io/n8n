/**
 * Integration tests for useWorkflowDocumentNodeHelpers.
 *
 * These tests use a real Pinia store (createPinia, not createTestingPinia) so
 * that every write goes through the actual workflowsStore and every read comes
 * back through the public API. This "round-trip" pattern (write → read back →
 * assert) is intentional:
 *
 *  - It catches regressions when consumers migrate from workflowsStore to
 *    workflowDocumentStore — the round-trip proves both paths produce the same
 *    result.
 *  - It survives internal refactors. When the internals change (e.g. owning
 *    its own refs instead of delegating), these tests stay unchanged because
 *    they only exercise the public contract.
 *  - Delegation-style tests (expect(store.method).toHaveBeenCalled()) would
 *    need to be rewritten every time internals change; round-trips do not.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowDocumentNodeHelpers } from './useWorkflowDocumentNodeHelpers';

describe('useWorkflowDocumentNodeHelpers', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('getNodeIssues', () => {
		it('returns null for a disabled node', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode({ disabled: true }) as INodeUi;

			expect(nodeHelpers.getNodeIssues(null, node)).toBeNull();
		});

		it('returns typeUnknown issue when nodeType is null', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INodeUi;

			expect(nodeHelpers.getNodeIssues(null, node)).toEqual({ typeUnknown: true });
		});

		it('returns null when typeUnknown is in ignoreIssues', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INodeUi;

			expect(nodeHelpers.getNodeIssues(null, node, ['typeUnknown'])).toBeNull();
		});

		it('returns null for a known nodeType with no issues', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INodeUi;
			const nodeType = mockNodeTypeDescription({
				inputs: [NodeConnectionTypes.Main],
				outputs: [NodeConnectionTypes.Main],
				properties: [],
			});

			expect(nodeHelpers.getNodeIssues(nodeType, node)).toBeNull();
		});

		it('reports a missing required input when inputs is an expression that the workflow resolves', () => {
			// The expression resolves to a required ai_tool input. Because there
			// are no parent nodes connected in this empty workflow, an input issue
			// is expected.
			const node = createTestNode({ name: 'Agent' }) as INodeUi;
			useWorkflowsStore().setNodes([node]);

			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const nodeType = mockNodeTypeDescription({
				inputs: `={{ [{ type: '${NodeConnectionTypes.AiTool}', required: true, displayName: 'Tool' }] }}`,
				outputs: [NodeConnectionTypes.Main],
				properties: [],
			});

			const issues = nodeHelpers.getNodeIssues(nodeType, node);
			expect(issues).toEqual({
				input: {
					[NodeConnectionTypes.AiTool]: ['No node connected to required input "Tool"'],
				},
			});
		});
	});

	describe('getNodeInputs', () => {
		it('returns static inputs array from nodeTypeData', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INode;
			const nodeType = mockNodeTypeDescription({ inputs: [NodeConnectionTypes.Main] });

			expect([...nodeHelpers.getNodeInputs(node, nodeType)]).toEqual([NodeConnectionTypes.Main]);
		});

		it('returns multiple inputs when nodeTypeData defines multiple inputs', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INode;
			const nodeType = mockNodeTypeDescription({
				inputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
			});

			expect([...nodeHelpers.getNodeInputs(node, nodeType)]).toEqual([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.Main,
			]);
		});

		it('evaluates an expression that does not reference $parameter', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const node = createTestNode() as INode;
			const nodeType = mockNodeTypeDescription({
				inputs: `={{ ['${NodeConnectionTypes.Main}'] }}`,
			});

			expect(nodeHelpers.getNodeInputs(node, nodeType)).toEqual([NodeConnectionTypes.Main]);
		});

		it('evaluates an expression that reads $parameter when the node is registered in the workflow', () => {
			const node = createTestNode({
				name: 'MyNode',
				parameters: { connectionCount: 2 },
			}) as INodeUi;
			useWorkflowsStore().setNodes([node]);

			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			const nodeType = mockNodeTypeDescription({
				inputs: `={{ $parameter.connectionCount === 2 ? ['${NodeConnectionTypes.Main}', '${NodeConnectionTypes.Main}'] : ['${NodeConnectionTypes.Main}'] }}`,
			});

			expect(nodeHelpers.getNodeInputs(node, nodeType)).toEqual([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.Main,
			]);
		});

		it('returns [] when the expression evaluation throws because the node is not in the workflow', () => {
			const nodeHelpers = useWorkflowDocumentNodeHelpers();
			// Node is not added to the workflow. Accessing $parameter.anything inside
			// the expression will trigger a TypeError in WorkflowDataProxy, which is
			// caught by getNodeInputs and falls back to an empty array.
			const node = createTestNode({ name: 'UnregisteredNode' }) as INode;
			const nodeType = mockNodeTypeDescription({
				inputs: '={{ $parameter.mode }}',
			});

			expect(nodeHelpers.getNodeInputs(node, nodeType)).toEqual([]);
		});
	});
});
