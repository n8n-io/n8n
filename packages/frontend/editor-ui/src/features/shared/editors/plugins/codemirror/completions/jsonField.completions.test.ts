import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
import * as utils from '@/features/shared/editors/plugins/codemirror/completions/utils';
import {
	extensions,
	natives,
} from '@/features/shared/editors/plugins/codemirror/completions/datatype.completions';

import type { CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';

beforeEach(async () => {
	setActivePinia(createTestingPinia());
	vi.spyOn(utils, 'receivesNoBinaryData').mockResolvedValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
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

describe('jsonField.completions', () => {
	test('should return null for invalid syntax: {{ $input.item.json..| }}', async () => {
		expect(await completions('{{ $input.item.json..| }}')).toBeNull();
	});

	test('should return null for non-existent node: {{ $("NonExistentNode").item.json.| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(null);
		expect(await completions('{{ $("NonExistentNode").item.json.| }}')).toBeNull();
	});

	test('should return completions for complex expressions: {{ Math.max($input.item.json.num1, $input.item.json.num2).| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(123);
		const result = await completions(
			'{{ Math.max($input.item.json.num1, $input.item.json.num2).| }}',
		);
		expect(result).toHaveLength(
			extensions({ typeName: 'number' }).length +
				natives({ typeName: 'number' }).length +
				['isEven()', 'isOdd()'].length,
		);
	});

	test('should return completions for boolean expressions: {{ $input.item.json.flag && $input.item.json.| }}', async () => {
		const json = { flag: true, key1: 'value1', key2: 'value2' };
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(json);
		const result = await completions('{{ $input.item.json.flag && $input.item.json.| }}');
		expect(result).toHaveLength(
			Object.keys(json).length + extensions({ typeName: 'object' }).length,
		);
	});

	test('should return null for undefined values: {{ $input.item.json.undefinedValue.| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(undefined);
		expect(await completions('{{ $input.item.json.undefinedValue.| }}')).toBeNull();
	});

	test('should return completions for large JSON objects: {{ $input.item.json.largeObject.| }}', async () => {
		const largeObject: { [key: string]: string } = {};
		for (let i = 0; i < 1000; i++) {
			largeObject[`key${i}`] = `value${i}`;
		}
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(largeObject);
		const result = await completions('{{ $input.item.json.largeObject.| }}');
		expect(result).toHaveLength(
			Object.keys(largeObject).length + extensions({ typeName: 'object' }).length,
		);
	});
});
