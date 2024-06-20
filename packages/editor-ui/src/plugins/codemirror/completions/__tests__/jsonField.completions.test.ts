import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import * as workflowHelpers from '@/composables/useWorkflowHelpers';
import * as utils from '@/plugins/codemirror/completions/utils';
import { extensions, natives } from '@/plugins/codemirror/completions/datatype.completions';

import type { CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';

let externalSecretsStore: ReturnType<typeof useExternalSecretsStore>;
let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

beforeEach(async () => {
	setActivePinia(createTestingPinia());

	externalSecretsStore = useExternalSecretsStore();
	uiStore = useUIStore();
	settingsStore = useSettingsStore();

	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
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

describe('jsonField.completions', () => {
	test('should return null for invalid syntax: {{ $input.item.json..| }}', () => {
		expect(completions('{{ $input.item.json..| }}')).toBeNull();
	});

	test('should return null for non-existent node: {{ $("NonExistentNode").item.json.| }}', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(null);
		expect(completions('{{ $("NonExistentNode").item.json.| }}')).toBeNull();
	});

	test('should return completions for complex expressions: {{ Math.max($input.item.json.num1, $input.item.json.num2).| }}', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(123);
		const result = completions('{{ Math.max($input.item.json.num1, $input.item.json.num2).| }}');
		expect(result).toHaveLength(
			extensions({ typeName: 'number' }).length +
				natives({ typeName: 'number' }).length +
				['isEven()', 'isOdd()'].length,
		);
	});

	test('should return completions for boolean expressions: {{ $input.item.json.flag && $input.item.json.| }}', () => {
		const json = { flag: true, key1: 'value1', key2: 'value2' };
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(json);
		const result = completions('{{ $input.item.json.flag && $input.item.json.| }}');
		expect(result).toHaveLength(
			Object.keys(json).length + extensions({ typeName: 'object' }).length,
		);
	});

	test('should return null for undefined values: {{ $input.item.json.undefinedValue.| }}', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(undefined);
		expect(completions('{{ $input.item.json.undefinedValue.| }}')).toBeNull();
	});

	test('should return completions for large JSON objects: {{ $input.item.json.largeObject.| }}', () => {
		const largeObject: { [key: string]: string } = {};
		for (let i = 0; i < 1000; i++) {
			largeObject[`key${i}`] = `value${i}`;
		}
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(largeObject);
		const result = completions('{{ $input.item.json.largeObject.| }}');
		expect(result).toHaveLength(
			Object.keys(largeObject).length + extensions({ typeName: 'object' }).length,
		);
	});
});
