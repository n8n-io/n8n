import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NodeConnectionTypes } from 'n8n-workflow';

import { useNodeToolCapability } from './useNodeToolCapability';

// Hoisted mutable state — avoids module-scope reactive refs surviving teardown.
const state = vi.hoisted(() => ({
	wfNode: null as { type: string; typeVersion: number } | null,
	nodeType: null as object | null,
	resolvedInputTypes: [] as string[],
	throwOnGetInputs: false,
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		value: {
			getNodeByName: (_name: string) => state.wfNode,
			getExpressionHandler: () => ({}),
		},
	}),
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (_type: string, _version?: number) => state.nodeType,
	}),
}));

vi.mock('n8n-workflow', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		NodeHelpers: {
			...(actual.NodeHelpers as Record<string, unknown>),
			getNodeInputs: () => {
				if (state.throwOnGetInputs) throw new Error('expression resolution failed');
				return state.resolvedInputTypes;
			},
			getConnectionTypes: (inputs: string[]) => inputs,
		},
	};
});

describe('useNodeToolCapability', () => {
	beforeEach(() => {
		state.wfNode = null;
		state.nodeType = null;
		state.resolvedInputTypes = [];
		state.throwOnGetInputs = false;
	});

	it('returns false for an empty node name', () => {
		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('')).toBe(false);
	});

	it('returns false when the node is not found in the workflow', () => {
		state.wfNode = null;
		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('NonExistentNode')).toBe(false);
	});

	it('returns false when the node type is not found', () => {
		state.wfNode = { type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 1 };
		state.nodeType = null;
		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('AI Agent')).toBe(false);
	});

	it('returns true when resolved inputs include AiTool', () => {
		state.wfNode = { type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 1 };
		state.nodeType = { name: 'Agent' };
		state.resolvedInputTypes = [NodeConnectionTypes.AiTool, NodeConnectionTypes.Main];
		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('AI Agent')).toBe(true);
	});

	it('returns false when resolved inputs do not include AiTool', () => {
		state.wfNode = { type: '@n8n/n8n-nodes-langchain.chainLlm', typeVersion: 1 };
		state.nodeType = { name: 'Basic LLM Chain' };
		state.resolvedInputTypes = [NodeConnectionTypes.Main, NodeConnectionTypes.AiLanguageModel];
		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('Basic LLM Chain')).toBe(false);
	});

	it('returns false (and does not throw) when getNodeInputs throws', () => {
		state.wfNode = { type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 1 };
		state.nodeType = { name: 'Agent' };
		state.throwOnGetInputs = true;

		const { nodeCanHaveTools } = useNodeToolCapability();
		expect(nodeCanHaveTools('AI Agent')).toBe(false);
	});
});
