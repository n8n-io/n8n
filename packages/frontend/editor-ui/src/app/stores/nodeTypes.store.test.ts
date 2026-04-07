import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

function makeNodeType(
	overrides: Partial<INodeTypeDescription> & Pick<INodeTypeDescription, 'name' | 'outputs'>,
): INodeTypeDescription {
	return {
		displayName: overrides.name,
		group: ['transform'],
		description: '',
		version: 1,
		defaults: {},
		inputs: ['main'],
		properties: [],
		...overrides,
	} as INodeTypeDescription;
}

describe('useNodeTypesStore', () => {
	let store: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: true }));
		store = useNodeTypesStore();
	});

	describe('isModelNode', () => {
		it('should return true for a node that outputs AiLanguageModel', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				outputs: [NodeConnectionTypes.AiLanguageModel],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(true);
		});

		it('should return true when outputs contain object format with AiLanguageModel type', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				outputs: [{ type: NodeConnectionTypes.AiLanguageModel, displayName: 'Model' }],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(true);
		});

		it('should return false for a node that outputs Main', () => {
			const nodeType = makeNodeType({
				name: 'n8n-nodes-base.httpRequest',
				outputs: [NodeConnectionTypes.Main],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(false);
		});

		it('should return false for a tool node', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				outputs: [NodeConnectionTypes.AiTool],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isModelNode(nodeType.name)).toBe(false);
		});

		it('should return false for an unknown node type', () => {
			expect(store.isModelNode('nonexistent.node')).toBe(false);
		});
	});

	describe('isToolNode', () => {
		it('should return true for a node that outputs AiTool', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				outputs: [NodeConnectionTypes.AiTool],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(true);
		});

		it('should return false for a model node', () => {
			const nodeType = makeNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				outputs: [NodeConnectionTypes.AiLanguageModel],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(false);
		});

		it('should return false for a regular main node', () => {
			const nodeType = makeNodeType({
				name: 'n8n-nodes-base.httpRequest',
				outputs: [NodeConnectionTypes.Main],
			});

			store.nodeTypes = {
				[nodeType.name]: { [nodeType.version as number]: nodeType },
			};

			expect(store.isToolNode(nodeType.name)).toBe(false);
		});

		it('should return false for an unknown node type', () => {
			expect(store.isToolNode('nonexistent.node')).toBe(false);
		});
	});
});
