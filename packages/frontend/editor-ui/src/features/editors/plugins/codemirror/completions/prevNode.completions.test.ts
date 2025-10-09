import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { usePrevNodeCompletions } from '@/features/editors/components/CodeNodeEditor/completions/prevNode.completions';

describe('prevNodeCompletions', () => {
	const { prevNodeCompletions } = usePrevNodeCompletions();
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	test('should return completions for explicit empty context', () => {
		const state = EditorState.create({ doc: '$prevNode.', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		const result = prevNodeCompletions(context);

		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(3);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: '$prevNode.name' }),
				expect.objectContaining({ label: '$prevNode.outputIndex' }),
				expect.objectContaining({ label: '$prevNode.runIndex' }),
			]),
		);
	});

	test('should return null for non-matching context', () => {
		const state = EditorState.create({ doc: 'randomText', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		expect(prevNodeCompletions(context)).toBeNull();
	});

	test('should return completions for partial match', () => {
		const state = EditorState.create({ doc: '$prevNode.n', selection: { anchor: 11 } });
		const context = new CompletionContext(state, 11, true);
		const result = prevNodeCompletions(context);

		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(3);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: '$prevNode.name' }),
				expect.objectContaining({ label: '$prevNode.outputIndex' }),
				expect.objectContaining({ label: '$prevNode.runIndex' }),
			]),
		);
	});

	test('should return null for empty matcher', () => {
		const state = EditorState.create({ doc: '.', selection: { anchor: 1 } });
		const context = new CompletionContext(state, 1, true);
		expect(prevNodeCompletions(context)).toBeNull();
	});
});
