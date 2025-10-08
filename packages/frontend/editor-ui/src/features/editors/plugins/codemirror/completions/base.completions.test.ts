import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import * as utils from '@/features/editors/plugins/codemirror/completions/utils';
import {
	extensions,
	luxonInstanceOptions,
	natives,
} from '@/features/editors/plugins/codemirror/completions/datatype.completions';

import type { CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/features/editors/plugins/codemirror/n8nLang';
import { LUXON_RECOMMENDED_OPTIONS, STRING_RECOMMENDED_OPTIONS } from './constants';
import uniqBy from 'lodash/uniqBy';

beforeEach(async () => {
	setActivePinia(createTestingPinia());

	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
});

describe('Additional Tests', () => {
	describe('Edge Case Completions', () => {
		test('should return no completions for empty string: {{ ""| }}', () => {
			expect(completions('{{ ""| }}')).toBeNull();
		});

		test('should return no completions for null value: {{ null.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(null);
			expect(completions('{{ null.| }}')).toBeNull();
		});

		test('should return no completions for undefined value: {{ undefined.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(undefined);
			expect(completions('{{ undefined.| }}')).toBeNull();
		});

		test('should return completions for deeply nested object: {{ $json.deep.nested.value.| }}', () => {
			const nestedObject = { deep: { nested: { value: 'test' } } };
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(
				nestedObject.deep.nested.value,
			);
			expect(completions('{{ $json.deep.nested.value.| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('Special Characters', () => {
		test('should handle completions for strings with special characters: {{ "special@char!".| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce('special@char!');
			expect(completions('{{ "special@char!".| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});

		test('should handle completions for strings with escape sequences: {{ "escape\\nsequence".| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce('escape\nsequence');
			expect(completions('{{ "escape\\nsequence".| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('Function Calls', () => {
		test('should return completions for function call results: {{ Math.abs(-5).| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(5);
			expect(completions('{{ Math.abs(-5).| }}')).toHaveLength(
				natives({ typeName: 'number' }).length +
					extensions({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
		});

		test('should return completions for chained function calls: {{ $now.plus({ days: 1 }).| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(
				DateTime.now().plus({ days: 1 }),
			);
			expect(completions('{{ $now.plus({ days: 1 }).| }}')).toHaveLength(
				uniqBy(
					luxonInstanceOptions().concat(extensions({ typeName: 'date' })),
					(option) => option.label,
				).length + LUXON_RECOMMENDED_OPTIONS.length,
			);
		});
	});
});

export function completions(docWithCursor: string, explicit = false) {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cursorPosition },
		extensions: [n8nLang()],
	});

	const context = new CompletionContext(state, cursorPosition, explicit);

	for (const completionSource of state.languageDataAt<CompletionSource>(
		'autocomplete',
		cursorPosition,
	)) {
		const result = completionSource(context);

		if (isCompletionResult(result)) return result.options;
	}

	return null;
}

function isCompletionResult(
	candidate: ReturnType<CompletionSource>,
): candidate is CompletionResult {
	return candidate !== null && 'from' in candidate && 'options' in candidate;
}
