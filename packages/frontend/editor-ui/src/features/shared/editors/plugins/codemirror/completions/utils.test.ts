import { createTestNode } from '@/__tests__/mocks';
import * as ndvStore from '@/features/ndv/shared/ndv.store';
import { CompletionContext, insertCompletionText } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { MockInstance } from 'vitest';
import {
	autocompletableNodeNames,
	expressionWithFirstItem,
	splitBaseTail,
	stripExcessParens,
	isAllowedInDotNotation,
} from './utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
	}),
}));

const { mockWorkflowDocumentStore } = vi.hoisted(() => ({
	mockWorkflowDocumentStore: {
		getChildNodes: vi.fn().mockReturnValue([]),
		getParentNodesByDepth: vi.fn().mockReturnValue([]),
		allNodes: [],
		name: '',
		settings: {},
		getPinDataSnapshot: () => ({}),
	},
}));

vi.mock('@/app/stores/workflowDocument.store', () => ({
	useWorkflowDocumentStore: vi.fn().mockReturnValue(mockWorkflowDocumentStore),
	createWorkflowDocumentId: vi.fn().mockReturnValue('test-id'),
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

			mockedStore(useWorkflowsStore);
			mockWorkflowDocumentStore.getChildNodes.mockReturnValue([]);
			mockWorkflowDocumentStore.getParentNodesByDepth.mockReturnValue([
				{ name: 'Node 2', depth: 1 },
				{ name: 'Node 1', depth: 2 },
			]);

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

			mockedStore(useWorkflowsStore);
			mockWorkflowDocumentStore.getChildNodes.mockReturnValue(['Agent']);
			mockWorkflowDocumentStore.getParentNodesByDepth.mockReturnValue([
				{ name: 'Normal Node', depth: 1 },
			]);

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

	describe('splitBaseTail', () => {
		const parse = (input: string) => javascriptLanguage.parser.parse(input);

		describe('standard dot access', () => {
			it('should return base and empty tail for: $json.', () => {
				expect(splitBaseTail(parse('$json.'), '$json.')).toEqual(['$json', '']);
			});

			it('should return base and partial tail for: $json.fo', () => {
				expect(splitBaseTail(parse('$json.fo'), '$json.fo')).toEqual(['$json', 'fo']);
			});
		});

		describe('optional chaining access', () => {
			it('should return base and empty tail for: $json?.', () => {
				expect(splitBaseTail(parse('$json?.'), '$json?.')).toEqual(['$json', '']);
			});

			it('should return base and partial tail for: $json?.fo', () => {
				expect(splitBaseTail(parse('$json?.fo'), '$json?.fo')).toEqual(['$json', 'fo']);
			});

			it('should handle chained optional access: $json?.foo.', () => {
				expect(splitBaseTail(parse('$json?.foo.'), '$json?.foo.')).toEqual(['$json?.foo', '']);
			});

			it('should handle chained optional access with partial tail: $json?.foo.ba', () => {
				expect(splitBaseTail(parse('$json?.foo.ba'), '$json?.foo.ba')).toEqual([
					'$json?.foo',
					'ba',
				]);
			});

			it('should handle double optional chaining: $json?.foo?.', () => {
				expect(splitBaseTail(parse('$json?.foo?.'), '$json?.foo?.')).toEqual(['$json?.foo', '']);
			});
		});
	});

	describe('isAllowedInDotNotation', () => {
		it('should return false for keys with forward slashes', () => {
			expect(
				isAllowedInDotNotation(
					'applications/n8n/available-to-users/google-cloud-geocoding-api-key',
				),
			).toBe(false);
			expect(isAllowedInDotNotation('path/to/secret')).toBe(false);
			expect(isAllowedInDotNotation('secret/with/slashes')).toBe(false);
		});

		it('should return false for keys with other special characters', () => {
			expect(isAllowedInDotNotation('key with spaces')).toBe(false);
			expect(isAllowedInDotNotation('key-with-hyphens')).toBe(false);
			expect(isAllowedInDotNotation('key.with.dots')).toBe(false);
			expect(isAllowedInDotNotation('key[with]brackets')).toBe(false);
		});

		it('should return true for valid JavaScript identifiers', () => {
			expect(isAllowedInDotNotation('validKey')).toBe(true);
			expect(isAllowedInDotNotation('valid_key')).toBe(true);
			expect(isAllowedInDotNotation('validKey123')).toBe(true);
			expect(isAllowedInDotNotation('_validKey')).toBe(true);
		});

		it('should return false for keys starting with numbers', () => {
			expect(isAllowedInDotNotation('123key')).toBe(false);
			expect(isAllowedInDotNotation('0invalid')).toBe(false);
		});
	});
});
