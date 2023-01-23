import { CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { dollarOptions } from '@/plugins/codemirror/completions/dollar.completions';
import {
	dateTimeOptions,
	nowTodayOptions,
} from '@/plugins/codemirror/completions/luxon.completions';
import * as utils from '@/plugins/codemirror/completions/utils';
import * as workflowHelpers from '@/mixins/workflowHelpers';
import { extensions } from '../datatype.completions';

beforeEach(() => {
	setActivePinia(createTestingPinia());
	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true);
});

describe('Top-level completions', () => {
	test('should return blank completions for: {{ | }}', async () => {
		expect(completions('{{ | }}')).toHaveLength(dollarOptions().length);
	});

	test('should return non-dollar completions for: {{ D| }}', async () => {
		expect(completions('{{ D| }}')).toHaveLength(1);
	});

	test('should return dollar completions for: {{ $| }}', async () => {
		expect(completions('{{ $| }}')).toHaveLength(dollarOptions().length);
	});

	test('should return node selector completions for: {{ $(| }}', async () => {
		const nodes = [
			{
				id: uuidv4(),
				name: 'Manual',
				position: [0, 0],
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
			},
			{
				id: uuidv4(),
				name: 'Set',
				position: [0, 0],
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
			},
		];

		const initialState = { workflows: { workflow: { nodes } } };

		setActivePinia(createTestingPinia({ initialState }));

		expect(completions('{{ $(| }}')).toHaveLength(nodes.length);
	});
});

describe('Luxon completions', () => {
	test('should return Luxon completions for: {{ DateTime.| }}', async () => {
		expect(completions('{{ DateTime.| }}')).toHaveLength(dateTimeOptions().length);
	});

	test('should return Luxon completions for: {{ $now.| }}', async () => {
		expect(completions('{{ $now.| }}')).toHaveLength(nowTodayOptions().length);
	});

	test('should return Luxon completions for: {{ $today.| }}', async () => {
		expect(completions('{{ $today.| }}')).toHaveLength(nowTodayOptions().length);
	});
});

describe('Resolution-based completions', () => {
	test('should return string completions', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce('abc');

		expect(completions('{{ "abc".| }}')).toHaveLength(extensions('string').length);
	});

	test('should return number completions', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(123);

		expect(completions('{{ (123).| }}')).toHaveLength(extensions('number').length);
	});

	test('should return array completions', () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce([1, 2, 3]);

		expect(completions('{{ [1, 2, 3].| }}')).toHaveLength(extensions('array').length);
	});

	test('should return object completions', () => {
		const object = { a: 1 };

		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(object);

		expect(completions('{{ ({ a: 1 }).| }}')).toHaveLength(
			Object.keys(object).length + extensions('object').length,
		);
	});
});

// @TODO Test datatype completions for references
// @TODO Test bracketAccess completions

function completions(docWithCursor: string) {
	const cursorPosition = docWithCursor.indexOf('|');

	const doc = docWithCursor.slice(0, cursorPosition) + docWithCursor.slice(cursorPosition + 1);

	const state = EditorState.create({
		doc,
		selection: { anchor: cursorPosition },
		extensions: [n8nLang()],
	});

	const context = new CompletionContext(state, cursorPosition, false);

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
