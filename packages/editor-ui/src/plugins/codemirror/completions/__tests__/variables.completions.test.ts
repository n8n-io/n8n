import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { useEnvironmentsStore } from '@/stores/environments.ee.store';
import { useVariablesCompletions } from '@/components/CodeNodeEditor/completions/variables.completions';
let environmentsStore: ReturnType<typeof useEnvironmentsStore>;

beforeEach(() => {
	setActivePinia(createTestingPinia());
	environmentsStore = useEnvironmentsStore();
});

describe('variablesCompletions', () => {
	test('should return completions for $vars prefix', () => {
		environmentsStore.variables = [
			{ key: 'VAR1', value: 'Value1', id: 1 },
			{ key: 'VAR2', value: 'Value2', id: 2 },
		];

		const state = EditorState.create({ doc: '$vars.', selection: { anchor: 6 } });
		const context = new CompletionContext(state, 6, true);
		const result = useVariablesCompletions().variablesCompletions(context);

		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(2);
		expect(result?.options).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: '$vars.VAR1', info: 'Value1' }),
				expect.objectContaining({ label: '$vars.VAR2', info: 'Value2' }),
			]),
		);
	});

	test('should return null for non-matching context', () => {
		const state = EditorState.create({ doc: 'randomText', selection: { anchor: 10 } });
		const context = new CompletionContext(state, 10, true);
		expect(useVariablesCompletions().variablesCompletions(context)).toBeNull();
	});

	test('should escape special characters in matcher', () => {
		environmentsStore.variables = [{ key: 'VAR1', value: 'Value1', id: 1 }];

		const state = EditorState.create({ doc: '$vars.', selection: { anchor: 6 } });
		const context = new CompletionContext(state, 6, true);
		const result = useVariablesCompletions().variablesCompletions(context, '$var$');

		expect(result).toBeNull();
	});

	test('should return completions for custom matcher', () => {
		environmentsStore.variables = [{ key: 'VAR1', value: 'Value1', id: 1 }];

		const state = EditorState.create({ doc: '$custom.', selection: { anchor: 8 } });
		const context = new CompletionContext(state, 8, true);
		const result = useVariablesCompletions().variablesCompletions(context, '$custom');

		expect(result).not.toBeNull();
		expect(result?.options).toHaveLength(1);
		expect(result?.options).toEqual(
			expect.arrayContaining([expect.objectContaining({ label: '$custom.VAR1', info: 'Value1' })]),
		);
	});
});
