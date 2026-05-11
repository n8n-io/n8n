import { describe, it, expect, vi } from 'vitest';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import type { IWorkflowDb } from '@/Interface';
import {
	nodeTypeToNewToolRef,
	toolRefToNode,
	updateToolRefFromNode,
	updateWorkflowToolRef,
	workflowToNewToolRef,
} from '../composables/useAgentToolRefAdapter';
import type { AgentJsonToolRef } from '../types';

vi.mock('uuid', () => ({ v4: () => 'mocked-uuid' }));

function makeNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		name: 'n8n-nodes-base.slack',
		displayName: 'Slack',
		description: 'Send messages to Slack',
		version: 1,
		group: ['output'],
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
		...overrides,
	} as INodeTypeDescription;
}

describe('useAgentToolRefAdapter', () => {
	describe('toolRefToNode()', () => {
		it('converts a node-type AgentJsonToolRef to an INode', () => {
			const ref: AgentJsonToolRef = {
				type: 'node',
				name: 'Post to channel',
				description: 'Send a Slack message',
				node: {
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 2,
					nodeParameters: { channel: 'general' },
				},
			};

			const node = toolRefToNode(ref);

			expect(node).toEqual({
				id: 'mocked-uuid',
				name: 'Post to channel',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: { channel: 'general' },
				credentials: undefined,
				position: [0, 0],
			});
		});

		it('returns null for non-node tool refs', () => {
			expect(toolRefToNode({ type: 'workflow', workflow: 'w-1' })).toBeNull();
			expect(toolRefToNode({ type: 'custom', id: 'c-1' })).toBeNull();
		});

		it('falls back to nodeType as name when ref.name is missing', () => {
			const ref: AgentJsonToolRef = {
				type: 'node',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1 },
			};
			expect(toolRefToNode(ref)?.name).toBe('n8n-nodes-base.slack');
		});

		it('forwards the stored nodeType unchanged so the form resolves the right variant', () => {
			// The stored name is the Tool-variant (`slackTool`) which carries the AI
			// codex. Rewriting it to the base here would break the $fromAI override
			// button, so toolRefToNode must pass the name through as-is.
			const ref: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1 },
			};
			expect(toolRefToNode(ref)?.type).toBe('n8n-nodes-base.slackTool');
		});

		it('converts strict credentials to INodeCredentials', () => {
			const ref: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: {
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					credentials: { slackApi: { id: 'cred-1', name: 'Prod Slack' } },
				},
			};
			expect(toolRefToNode(ref)?.credentials).toEqual({
				slackApi: { id: 'cred-1', name: 'Prod Slack' },
			});
		});
	});

	describe('nodeTypeToNewToolRef()', () => {
		it('produces a tool ref with the node display name', () => {
			const ref = nodeTypeToNewToolRef(makeNodeType({ displayName: 'Gmail' }));
			expect(ref.type).toBe('node');
			expect(ref.name).toBe('Gmail');
		});

		it('uses the latest number when version is an array', () => {
			const ref = nodeTypeToNewToolRef(makeNodeType({ version: [1, 2, 3] }));
			expect(ref.node?.nodeTypeVersion).toBe(3);
		});

		it('uses the numeric version as-is', () => {
			const ref = nodeTypeToNewToolRef(makeNodeType({ version: 5 }));
			expect(ref.node?.nodeTypeVersion).toBe(5);
		});

		it('seeds empty parameters without persisting an input schema', () => {
			const ref = nodeTypeToNewToolRef(makeNodeType());
			expect(ref.node?.nodeParameters).toEqual({});
			expect(ref.id).toBeUndefined();
			expect(ref).not.toHaveProperty('inputSchema');
		});

		it('persists the Tool-variant nodeType so the form gets the AI codex needed for $fromAI', () => {
			// Tool-variant descriptions carry the `AI/Tools` codex that powers the
			// "Let the model define this parameter" override button. Stripping the
			// suffix would route the form to the base description (no codex) and
			// break that feature — so we store the variant name as-is.
			const ref = nodeTypeToNewToolRef(
				makeNodeType({
					name: 'n8n-nodes-base.slackTool',
					displayName: 'Slack Tool',
				}),
			);
			expect(ref.node?.nodeType).toBe('n8n-nodes-base.slackTool');
			// Display label still drops the " Tool" suffix so the sidebar reads "Slack".
			expect(ref.name).toBe('Slack');
		});

		it('leaves native tool names untouched (no suffix to handle)', () => {
			const ref = nodeTypeToNewToolRef(
				makeNodeType({ name: 'toolWikipedia', displayName: 'Wikipedia' }),
			);
			expect(ref.node?.nodeType).toBe('toolWikipedia');
			expect(ref.name).toBe('Wikipedia');
		});

		it('does not persist an input schema for native tool nodes', () => {
			const ref = nodeTypeToNewToolRef(
				makeNodeType({
					name: 'toolWikipedia',
					displayName: 'Wikipedia',
					description: 'Search Wikipedia',
					outputs: ['ai_tool'],
					properties: [],
				} as Partial<INodeTypeDescription>),
			);
			expect(ref).not.toHaveProperty('inputSchema');
		});

		it('does not persist an input schema for non-native tool nodes', () => {
			const ref = nodeTypeToNewToolRef(
				makeNodeType({
					name: 'n8n-nodes-base.slackTool',
					displayName: 'Slack Tool',
					outputs: ['ai_tool'],
					properties: [
						{ displayName: 'Resource', name: 'resource', type: 'options', default: 'channel' },
					] as INodeTypeDescription['properties'],
				} as Partial<INodeTypeDescription>),
			);
			expect(ref).not.toHaveProperty('inputSchema');
		});
	});

	describe('updateToolRefFromNode()', () => {
		it('merges edits from an INode back into the ref, preserving description', () => {
			const original: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				description: 'Send a Slack message',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1, nodeParameters: {} },
			};

			const node: INode = {
				id: 'n-1',
				name: 'Slack v2',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				parameters: { channel: 'general' },
				position: [0, 0],
			};

			const updated = updateToolRefFromNode(original, node);

			expect(updated).toEqual({
				type: 'node',
				name: 'Slack v2',
				description: 'Send a Slack message',
				node: {
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 2,
					nodeParameters: { channel: 'general' },
					credentials: undefined,
				},
			});
		});

		it('drops credentials whose id is not yet persisted (null id)', () => {
			const original: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1 },
			};
			const node: INode = {
				id: 'n-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
				credentials: {
					slackApi: { id: null, name: 'draft' },
				},
			};

			const updated = updateToolRefFromNode(original, node);
			expect(updated.node?.credentials).toBeUndefined();
		});

		it('keeps persisted credentials', () => {
			const original: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1 },
			};
			const node: INode = {
				id: 'n-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
				credentials: {
					slackApi: { id: 'cred-1', name: 'Prod' },
				},
			};

			const updated = updateToolRefFromNode(original, node);
			expect(updated.node?.credentials).toEqual({
				slackApi: { id: 'cred-1', name: 'Prod' },
			});
		});

		it('returns the original unchanged for non-node tool refs', () => {
			const workflowRef: AgentJsonToolRef = { type: 'workflow', workflow: 'w-1' };
			const node: INode = {
				id: 'n-1',
				name: 'x',
				type: 't',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
			};
			expect(updateToolRefFromNode(workflowRef, node)).toBe(workflowRef);
		});

		it('saves $fromAI overrides only in nodeParameters', () => {
			const original: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: {
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
				},
			};

			const node: INode = {
				id: 'n-1',
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					channel: "={{ $fromAI('channel', 'Slack channel id', 'string') }}",
					message: "={{ $fromAI('message', 'Message body') }}",
				},
			};

			const updated = updateToolRefFromNode(original, node);
			expect(updated).not.toHaveProperty('inputSchema');
			expect(updated.node?.nodeParameters).toEqual(node.parameters);
		});
	});

	describe('workflowToNewToolRef()', () => {
		function makeWorkflow(overrides: Partial<IWorkflowDb> = {}): IWorkflowDb {
			return {
				id: 'wf-1',
				name: 'My workflow',
				description: 'Ship a daily summary',
				active: false,
				isArchived: false,
				createdAt: '2026-01-01T00:00:00Z',
				updatedAt: '2026-01-02T00:00:00Z',
				versionId: 'v-1',
				activeVersionId: null,
				...overrides,
			} as IWorkflowDb;
		}

		it('persists the workflow name on `ref.workflow` — the backend looks it up by name', () => {
			// See cli/src/modules/agents/tools/workflow-tool-factory.ts:506 — the
			// backend queries `workflowRepository.findOne({ where: { name } })`.
			const ref = workflowToNewToolRef(makeWorkflow({ name: 'Notify Sales' }));
			expect(ref).toMatchObject({
				type: 'workflow',
				workflow: 'Notify Sales',
				name: 'Notify Sales',
				description: 'Ship a daily summary',
				allOutputs: false,
			});
			expect(ref.id).toBeUndefined();
		});

		it('defaults description to empty when the workflow has none', () => {
			const ref = workflowToNewToolRef(makeWorkflow({ description: null }));
			expect(ref.description).toBe('');
		});
	});

	describe('updateWorkflowToolRef()', () => {
		it('merges edited fields into the ref, preserving type and workflow reference', () => {
			const original: AgentJsonToolRef = {
				type: 'workflow',
				workflow: 'Notify Sales',
				name: 'Notify Sales',
				description: 'old',
				allOutputs: false,
			};
			const updated = updateWorkflowToolRef(original, {
				name: 'Ping Sales',
				description: 'new',
				allOutputs: true,
			});
			expect(updated).toStrictEqual({
				type: 'workflow',
				workflow: 'Notify Sales',
				name: 'Ping Sales',
				description: 'new',
				allOutputs: true,
			});
		});

		it('is a no-op for non-workflow refs', () => {
			const nodeRef: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1 },
			};
			expect(
				updateWorkflowToolRef(nodeRef, { name: 'x', description: 'y', allOutputs: true }),
			).toBe(nodeRef);
		});
	});
});
