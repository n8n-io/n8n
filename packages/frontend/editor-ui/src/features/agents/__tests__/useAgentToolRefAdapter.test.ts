import { describe, it, expect, vi } from 'vitest';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import {
	isToolMissingCredentials,
	nodeTypeToNewToolRef,
	toolRefToNode,
	updateToolRefFromNode,
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

		it('seeds empty parameters and an empty input schema', () => {
			const ref = nodeTypeToNewToolRef(makeNodeType());
			expect(ref.node?.nodeParameters).toEqual({});
			expect(ref.inputSchema).toEqual({ type: 'object', properties: {} });
		});
	});

	describe('updateToolRefFromNode()', () => {
		it('merges edits from an INode back into the ref, preserving description', () => {
			const original: AgentJsonToolRef = {
				type: 'node',
				name: 'Slack',
				description: 'Send a Slack message',
				node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 1, nodeParameters: {} },
				inputSchema: { type: 'object' },
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
				inputSchema: { type: 'object' },
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
	});

	describe('isToolMissingCredentials()', () => {
		const ref = (credentials?: Record<string, { id: string; name: string }>): AgentJsonToolRef => ({
			type: 'node',
			name: 'Slack',
			node: {
				nodeType: 'n8n-nodes-base.slack',
				nodeTypeVersion: 1,
				credentials,
			},
		});

		it('returns false when the node declares no credentials', () => {
			const nt = makeNodeType({ credentials: [] });
			expect(isToolMissingCredentials(ref(), nt)).toBe(false);
		});

		it('returns false when all required credentials are saved', () => {
			const nt = makeNodeType({ credentials: [{ name: 'slackApi', required: true }] });
			expect(isToolMissingCredentials(ref({ slackApi: { id: 'c', name: 'x' } }), nt)).toBe(false);
		});

		it('returns true when a required credential has no saved entry', () => {
			const nt = makeNodeType({ credentials: [{ name: 'slackApi', required: true }] });
			expect(isToolMissingCredentials(ref(), nt)).toBe(true);
		});

		it('treats missing `required` as required (default true)', () => {
			const nt = makeNodeType({ credentials: [{ name: 'slackApi' }] });
			expect(isToolMissingCredentials(ref(), nt)).toBe(true);
		});

		it('ignores credentials explicitly marked required: false', () => {
			const nt = makeNodeType({ credentials: [{ name: 'slackApi', required: false }] });
			expect(isToolMissingCredentials(ref(), nt)).toBe(false);
		});

		it('returns false for non-node tool refs', () => {
			const nt = makeNodeType({ credentials: [{ name: 'slackApi', required: true }] });
			expect(isToolMissingCredentials({ type: 'workflow', workflow: 'w-1' }, nt)).toBe(false);
		});

		it('returns false when the node type cannot be resolved', () => {
			expect(isToolMissingCredentials(ref(), null)).toBe(false);
		});
	});
});
