import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
import * as utils from '@/features/shared/editors/plugins/codemirror/completions/utils';
import {
	extensions,
	luxonInstanceOptions,
	natives,
} from '@/features/shared/editors/plugins/codemirror/completions/datatype.completions';

import type { CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';
import { LUXON_RECOMMENDED_OPTIONS, STRING_RECOMMENDED_OPTIONS } from './constants';
import uniqBy from 'lodash/uniqBy';

beforeEach(async () => {
	setActivePinia(createTestingPinia());

	vi.spyOn(utils, 'receivesNoBinaryData').mockResolvedValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
});

describe('Additional Tests', () => {
	describe('Edge Case Completions', () => {
		test('should return no completions for empty string: {{ ""| }}', async () => {
			expect(await completions('{{ ""| }}')).toBeNull();
		});

		test('should return no completions for null value: {{ null.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(null);
			expect(await completions('{{ null.| }}')).toBeNull();
		});

		test('should return no completions for undefined value: {{ undefined.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(undefined);
			expect(await completions('{{ undefined.| }}')).toBeNull();
		});

		test('should return completions for deeply nested object: {{ $json.deep.nested.value.| }}', async () => {
			const nestedObject = { deep: { nested: { value: 'test' } } };
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(
				nestedObject.deep.nested.value,
			);
			expect(await completions('{{ $json.deep.nested.value.| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('Special Characters', () => {
		test('should handle completions for strings with special characters: {{ "special@char!".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('special@char!');
			expect(await completions('{{ "special@char!".| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});

		test('should handle completions for strings with escape sequences: {{ "escape\\nsequence".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('escape\nsequence');
			expect(await completions('{{ "escape\\nsequence".| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('Function Calls', () => {
		test('should return completions for function call results: {{ Math.abs(-5).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(5);
			expect(await completions('{{ Math.abs(-5).| }}')).toHaveLength(
				natives({ typeName: 'number' }).length +
					extensions({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
		});

		test('should return completions for chained function calls: {{ $now.plus({ days: 1 }).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(
				DateTime.now().plus({ days: 1 }),
			);
			expect(await completions('{{ $now.plus({ days: 1 }).| }}')).toHaveLength(
				uniqBy(
					luxonInstanceOptions().concat(extensions({ typeName: 'date' })),
					(option) => option.label,
				).length + LUXON_RECOMMENDED_OPTIONS.length,
			);
		});
	});
});

export async function completions(docWithCursor: string, explicit = false) {
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
		const result = await completionSource(context);

		if (isCompletionResult(result)) return result.options;
	}

	return null;
}

function isCompletionResult(candidate: unknown): candidate is CompletionResult {
	return (
		candidate !== null &&
		typeof candidate === 'object' &&
		'from' in candidate &&
		'options' in candidate
	);
}
