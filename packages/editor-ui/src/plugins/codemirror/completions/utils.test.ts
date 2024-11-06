import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { autocompletableNodeNames, expressionWithFirstItem } from './utils';
import type { MockInstance } from 'vitest';
import * as ndvStore from '@/stores/ndv.store';
import { NodeConnectionType, type IConnections } from 'n8n-workflow';

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
	}),
}));

describe('completion utils', () => {
	describe('expressionWithFirstItem', () => {
		it('should replace $input.item', () => {
			const source = '$input.item.json.foo.bar';
			const expected = '$input.first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $input.itemMatching()', () => {
			const source = '$input.itemMatching(4).json.foo.bar';
			const expected = '$input.first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $("Node Name").itemMatching()', () => {
			const source = '$("Node Name").itemMatching(4).json.foo.bar';
			const expected = '$("Node Name").first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should replace $("Node Name").item', () => {
			const source = '$("Node Name").item.json.foo.bar';
			const expected = '$("Node Name").first().json.foo.bar';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});

		it('should not replace anything in unrelated expressions', () => {
			const source = '$input.first().foo.item.fn($json.item.foo)';
			const expected = '$input.first().foo.item.fn($json.item.foo)';
			const tree = javascriptLanguage.parser.parse(source);
			const result = expressionWithFirstItem(tree, source);
			expect(result).toBe(expected);
		});
	});

	describe('autocompletableNodeNames', () => {
		it('should work for normal nodes', () => {
			const nodes = [
				createTestNode({ name: 'Node 1' }),
				createTestNode({ name: 'Node 2' }),
				createTestNode({ name: 'Node 3' }),
			];
			const connections = {
				[nodes[0].name]: {
					[NodeConnectionType.Main]: [
						[{ node: nodes[1].name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
				[nodes[1].name]: {
					[NodeConnectionType.Main]: [
						[{ node: nodes[2].name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const workflowHelpersMock: MockInstance = vi.spyOn(workflowHelpers, 'useWorkflowHelpers');
			workflowHelpersMock.mockReturnValue({
				getCurrentWorkflow: vi.fn(() => workflowObject),
			});
			const ndvStoreMock: MockInstance = vi.spyOn(ndvStore, 'useNDVStore');
			ndvStoreMock.mockReturnValue({ activeNode: nodes[2] });

			expect(autocompletableNodeNames()).toEqual(['Node 2', 'Node 1']);
		});

		it('should work for AI tool nodes', () => {
			const nodes = [
				createTestNode({ name: 'Normal Node' }),
				createTestNode({ name: 'Agent' }),
				createTestNode({ name: 'Tool' }),
			];
			const connections: IConnections = {
				[nodes[0].name]: {
					[NodeConnectionType.Main]: [
						[{ node: nodes[1].name, type: NodeConnectionType.Main, index: 0 }],
					],
				},
				[nodes[2].name]: {
					[NodeConnectionType.AiMemory]: [
						[{ node: nodes[1].name, type: NodeConnectionType.AiMemory, index: 0 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const workflowHelpersMock: MockInstance = vi.spyOn(workflowHelpers, 'useWorkflowHelpers');
			workflowHelpersMock.mockReturnValue({
				getCurrentWorkflow: vi.fn(() => workflowObject),
			});
			const ndvStoreMock: MockInstance = vi.spyOn(ndvStore, 'useNDVStore');
			ndvStoreMock.mockReturnValue({ activeNode: nodes[2] });

			expect(autocompletableNodeNames()).toEqual(['Normal Node']);
		});
	});
});
