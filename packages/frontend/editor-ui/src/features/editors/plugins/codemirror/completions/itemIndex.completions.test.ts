import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { describe, test, expect, beforeEach } from 'vitest';
import { useItemIndexCompletions } from '@/features/editors/components/CodeNodeEditor/completions/itemIndex.completions';

let mode: 'runOnceForEachItem' | 'runOnceForAllItems';

beforeEach(() => {
	setActivePinia(createTestingPinia());
	mode = 'runOnceForAllItems';
});

describe('itemIndexCompletions', () => {
	test('should return completions for $input. in all-items mode', () => {
		const state = EditorState.create({ doc: '$input.', selection: { anchor: 7 } });
		const context = new CompletionContext(state, 7, true);
		const result = useItemIndexCompletions(mode).inputCompletions.call({ mode }, context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(4);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: '$input.first()' }),
				expect.objectContaining({ label: '$input.last()' }),
				expect.objectContaining({ label: '$input.all()' }),
				expect.objectContaining({ label: '$input.itemMatching()' }),
			]),
		);
	});

	test('should return completions for $input. in single-item mode', () => {
		mode = 'runOnceForEachItem';
		const state = EditorState.create({ doc: '$input.', selection: { anchor: 7 } });
		const context = new CompletionContext(state, 7, true);
		const result = useItemIndexCompletions(mode).inputCompletions.call({ mode }, context);
		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(1);
		expect(result?.options).toEqual(
			expect.arrayContaining([expect.objectContaining({ label: '$input.item' })]),
		);
	});

	test('should return null for non-matching context', () => {
		const state = EditorState.create({ doc: 'randomText', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		expect(useItemIndexCompletions(mode).inputCompletions.call({ mode }, context)).toBeNull();
	});

	test('should return null for non-matching selector context', () => {
		const state = EditorState.create({ doc: 'randomText', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		expect(useItemIndexCompletions(mode).selectorCompletions.call({ mode }, context)).toBeNull();
	});
});
