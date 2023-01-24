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
import { mock } from './mock';

beforeEach(() => {
	setActivePinia(createTestingPinia());
	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
});

describe('Top-level completions', () => {
	test('should return blank completions for: {{ | }}', () => {
		expect(completions('{{ | }}')).toHaveLength(dollarOptions().length);
	});

	test('should return non-dollar completions for: {{ D| }}', () => {
		expect(completions('{{ D| }}')).toHaveLength(1); // DateTime
	});

	test('should return dollar completions for: {{ $| }}', () => {
		expect(completions('{{ $| }}')).toHaveLength(dollarOptions().length);
	});

	test('should return node selector completions for: {{ $(| }}', () => {
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

describe('Luxon method completions', () => {
	test('should return static method completions for: {{ DateTime.| }}', () => {
		expect(completions('{{ DateTime.| }}')).toHaveLength(dateTimeOptions().length);
	});

	test('should return instance method completions for: {{ $now.| }}', () => {
		expect(completions('{{ $now.| }}')).toHaveLength(nowTodayOptions().length);
	});

	test('should return instance method completions for: {{ $today.| }}', () => {
		expect(completions('{{ $today.| }}')).toHaveLength(nowTodayOptions().length);
	});
});

describe('Resolution-based completions', () => {
	describe('literals', () => {
		test('should return completions for string literal', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce('abc');

			expect(completions('{{ "abc".| }}')).toHaveLength(extensions('string').length);
		});

		test('should return completions for number literal', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(123);

			expect(completions('{{ (123).| }}')).toHaveLength(extensions('number').length);
		});

		test('should return completions for array literal', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce([1, 2, 3]);

			expect(completions('{{ [1, 2, 3].| }}')).toHaveLength(extensions('array').length);
		});

		test('should return completions for object literal', () => {
			const object = { a: 1 };

			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValueOnce(object);

			expect(completions('{{ ({ a: 1 }).| }}')).toHaveLength(
				Object.keys(object).length + extensions('object').length,
			);
		});
	});

	describe('references', () => {
		test('should return completions for: {{ $input.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.inputProxy);

			expect(completions('{{ $input.| }}')).toHaveLength(Reflect.ownKeys(mock.inputProxy).length);
		});

		test("should return completions for: {{ $('nodeName').| }}", () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.nodeSelectorProxy);

			expect(completions('{{ $nodeName.| }}')).toHaveLength(
				Reflect.ownKeys(mock.nodeSelectorProxy).length,
			);
		});

		['{{ $input.item.| }}', '{{ $input.first().| }}', '{{ $input.last().| }}'].forEach(
			(expression) => {
				test(`should return completions for: ${expression}`, () => {
					vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item);

					expect(completions(expression)).toHaveLength(1); // json
				});
			},
		);

		test('should return no completions for: {{ $input.all().| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue([mock.item]);

			expect(completions('{{ $input.all().| }}')).toBeNull();
		});

		[
			'{{ $input.item.| }}',
			'{{ $input.first().| }}',
			'{{ $input.last().| }}',
			'{{ $input.all()[0].| }}',
		].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json);

				expect(completions(expression)).toHaveLength(Object.keys(mock.item.json).length);
			});
		});

		test('should return completions for: {{ $input.item.json.str.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json.str);

			expect(completions('{{ $input.item.json.str.| }}')).toHaveLength(extensions('string').length);
		});

		test('should return completions for: {{ $input.item.json.num.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json.num);

			expect(completions('{{ $input.item.json.num.| }}')).toHaveLength(extensions('number').length);
		});

		test('should return completions for: {{ $input.item.json.arr.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json.arr);

			expect(completions('{{ $input.item.json.arr.| }}')).toHaveLength(extensions('array').length);
		});

		test('should return completions for: {{ $input.item.json.obj.| }}', () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json.obj);

			expect(completions('{{ $input.item.json.obj.| }}')).toHaveLength(
				Object.keys(mock.item.json.obj).length + extensions('object').length,
			);
		});
	});

	describe('bracket access', () => {
		['{{ $input.item.json[| }}', '{{ $json[| }}'].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json);

				const found = completions(expression);

				if (!found) throw new Error('Expected bracket access completions');

				expect(found).toHaveLength(Object.keys(mock.item.json).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});

		["{{ $input.item.json['obj'][| }}", "{{ $json['obj'][| }}"].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(mock.item.json.obj);

				const found = completions(expression);

				if (!found) throw new Error('Expected bracket access completions');

				expect(found).toHaveLength(Object.keys(mock.item.json.obj).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});
	});
});

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
