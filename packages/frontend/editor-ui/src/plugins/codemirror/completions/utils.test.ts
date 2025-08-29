import { createTestNode, createTestWorkflowObject } from '@/__tests__/mocks';
import * as ndvStore from '@/stores/ndv.store';
import { CompletionContext, insertCompletionText } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { NodeConnectionTypes, type IConnections } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { autocompletableNodeNames, expressionWithFirstItem, stripExcessParens } from './utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
	}),
}));

const editorFromString = (docWithCursor: string) => {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cursorPosition },
	});

	return {
		context: new CompletionContext(state, cursorPosition, false),
		view: new EditorView({ state, doc }),
	};
};

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
		beforeEach(() => {
			const pinia = createTestingPinia();
			setActivePinia(pinia);
		});

		it('should work for normal nodes', () => {
			const nodes = [
				createTestNode({ name: 'Node 1' }),
				createTestNode({ name: 'Node 2' }),
				createTestNode({ name: 'Node 3' }),
			];
			const connections = {
				[nodes[0].name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: nodes[1].name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				[nodes[1].name]: {
					[NodeConnectionTypes.Main]: [
						[{ node: nodes[2].name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.workflowObject = workflowObject;
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
					[NodeConnectionTypes.Main]: [
						[{ node: nodes[1].name, type: NodeConnectionTypes.Main, index: 0 }],
					],
				},
				[nodes[2].name]: {
					[NodeConnectionTypes.AiMemory]: [
						[{ node: nodes[1].name, type: NodeConnectionTypes.AiMemory, index: 0 }],
					],
				},
			};
			const workflowObject = createTestWorkflowObject({
				nodes,
				connections,
			});

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.workflowObject = workflowObject;

			const ndvStoreMock: MockInstance = vi.spyOn(ndvStore, 'useNDVStore');
			ndvStoreMock.mockReturnValue({ activeNode: nodes[2] });

			expect(autocompletableNodeNames()).toEqual(['Normal Node']);
		});
	});

	describe('stripExcessParens', () => {
		test.each([
			{
				doc: '$(|',
				completion: { label: "$('Node Name')" },
				expected: "$('Node Name')",
			},
			{
				doc: '$(|)',
				completion: { label: "$('Node Name')" },
				expected: "$('Node Name')",
			},
			{
				doc: "$('|')",
				completion: { label: "$('Node Name')" },
				expected: "$('Node Name')",
			},
			{
				doc: "$('No|')",
				completion: { label: "$('Node Name')" },
				expected: "$('Node Name')",
			},
		])('should complete $doc to $expected', ({ doc, completion, expected }) => {
			const { context, view } = editorFromString(doc);
			const result = stripExcessParens(context)(completion);
			const from = 0;
			const to = doc.indexOf('|');
			if (typeof result.apply === 'function') {
				result.apply(view, completion, from, to);
			} else {
				view.dispatch(insertCompletionText(view.state, completion.label, from, to));
			}

			expect(view.state.doc.toString()).toEqual(expected);
		});
	});
});
