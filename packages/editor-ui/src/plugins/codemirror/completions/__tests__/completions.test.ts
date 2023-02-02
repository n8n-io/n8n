import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import * as workflowHelpers from '@/mixins/workflowHelpers';
import { dollarOptions } from '@/plugins/codemirror/completions/dollar.completions';
import * as utils from '@/plugins/codemirror/completions/utils';
import {
	extensions,
	luxonInstanceOptions,
	luxonStaticOptions,
	natives,
} from '@/plugins/codemirror/completions/datatype.completions';

import { mockNodes, mockProxy } from './mock';
import { CompletionContext, CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/plugins/codemirror/n8nLang';

beforeEach(() => {
	setActivePinia(createTestingPinia());
	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
});

describe('No completions', () => {
	test('should not return completions mid-word: {{ "ab|c" }}', () => {
		expect(completions('{{ "ab|c" }}')).toBeNull();
	});

	test('should not return completions for isolated dot: {{ "abc. |" }}', () => {
		expect(completions('{{ "abc. |" }}')).toBeNull();
	});
});

describe('Top-level completions', () => {
	test('should return dollar completions for blank position: {{ | }}', () => {
		expect(completions('{{ | }}')).toHaveLength(dollarOptions().length);
	});

	test('should return DateTime completion for: {{ D| }}', () => {
		const found = completions('{{ D| }}');

		if (!found) throw new Error('Expected to find completion');

		expect(found).toHaveLength(1);
		expect(found[0].label).toBe('DateTime');
	});

	test('should return Math completion for: {{ M| }}', () => {
		const found = completions('{{ M| }}');

		if (!found) throw new Error('Expected to find completion');

		expect(found).toHaveLength(1);
		expect(found[0].label).toBe('Math');
	});

	test('should return dollar completions for: {{ $| }}', () => {
		expect(completions('{{ $| }}')).toHaveLength(dollarOptions().length);
	});

	test('should return node selector completions for: {{ $(| }}', () => {
		const initialState = { workflows: { workflow: { nodes: mockNodes } } };

		setActivePinia(createTestingPinia({ initialState }));

		expect(completions('{{ $(| }}')).toHaveLength(mockNodes.length);
	});
});

describe('Luxon method completions', () => {
	const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');

	test('should return class completions for: {{ DateTime.| }}', () => {
		// @ts-expect-error Spied function is mistyped
		resolveParameterSpy.mockReturnValueOnce(DateTime);

		expect(completions('{{ DateTime.| }}')).toHaveLength(luxonStaticOptions().length);
	});

	test('should return instance completions for: {{ $now.| }}', () => {
		// @ts-expect-error Spied function is mistyped
		resolveParameterSpy.mockReturnValueOnce(DateTime.now());

		expect(completions('{{ $now.| }}')).toHaveLength(
			luxonInstanceOptions().length + extensions('date').length,
		);
	});

	test('should return instance completions for: {{ $today.| }}', () => {
		// @ts-expect-error Spied function is mistyped
		resolveParameterSpy.mockReturnValueOnce(DateTime.now());

		expect(completions('{{ $today.| }}')).toHaveLength(
			luxonInstanceOptions().length + extensions('date').length,
		);
	});
});

describe('Resolution-based completions', () => {
	const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');

	describe('literals', () => {
		test('should return completions for string literal: {{ "abc".| }}', () => {
			// @ts-expect-error Spied function is mistyped
			resolveParameterSpy.mockReturnValueOnce('abc');

			expect(completions('{{ "abc".| }}')).toHaveLength(
				natives('string').length + extensions('string').length,
			);
		});

		test('should return completions for number literal: {{ (123).| }}', () => {
			// @ts-expect-error Spied function is mistyped
			resolveParameterSpy.mockReturnValueOnce(123);

			expect(completions('{{ (123).| }}')).toHaveLength(
				natives('number').length + extensions('number').length,
			);
		});

		test('should return completions for array literal: {{ [1, 2, 3].| }}', () => {
			// @ts-expect-error Spied function is mistyped
			resolveParameterSpy.mockReturnValueOnce([1, 2, 3]);

			expect(completions('{{ [1, 2, 3].| }}')).toHaveLength(
				natives('array').length + extensions('array').length,
			);
		});

		test('should return completions for object literal', () => {
			const object = { a: 1 };

			resolveParameterSpy.mockReturnValueOnce(object);

			expect(completions('{{ ({ a: 1 }).| }}')).toHaveLength(
				Object.keys(object).length + natives('object').length + extensions('object').length,
			);
		});
	});

	describe('bracket-aware completions', () => {
		const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');
		const { $input } = mockProxy;

		test('should return bracket-aware completions for: {{ $input.item.json.str.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.str);

			const found = completions('{{ $input.item.json.str.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(extensions('string').length);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});

		test('should return bracket-aware completions for: {{ $input.item.json.num.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.num);

			const found = completions('{{ $input.item.json.num.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(extensions('number').length);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});

		test('should return bracket-aware completions for: {{ $input.item.json.arr.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.arr);

			const found = completions('{{ $input.item.json.arr.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(extensions('array').length);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});
	});

	describe('references', () => {
		const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');
		const { $input, $ } = mockProxy;

		test('should return completions for: {{ $input.| }}', () => {
			resolveParameterSpy.mockReturnValue($input);

			expect(completions('{{ $input.| }}')).toHaveLength(Reflect.ownKeys($input).length);
		});

		test("should return completions for: {{ $('nodeName').| }}", () => {
			resolveParameterSpy.mockReturnValue($('Rename'));

			expect(completions('{{ $("Rename").| }}')).toHaveLength(
				Reflect.ownKeys($('Rename')).length - ['pairedItem'].length,
			);
		});

		test('should return completions for: {{ $input.item.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item);

			const found = completions('{{ $input.item.| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return completions for: {{ $input.first().| }}', () => {
			resolveParameterSpy.mockReturnValue($input.first());

			const found = completions('{{ $input.first().| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return completions for: {{ $input.last().| }}', () => {
			resolveParameterSpy.mockReturnValue($input.last());

			const found = completions('{{ $input.last().| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return no completions for: {{ $input.all().| }}', () => {
			// @ts-expect-error
			resolveParameterSpy.mockReturnValue([$input.item]);

			expect(completions('{{ $input.all().| }}')).toBeNull();
		});

		test("should return completions for: '{{ $input.item.| }}'", () => {
			resolveParameterSpy.mockReturnValue($input.item.json);

			expect(completions('{{ $input.item.| }}')).toHaveLength(
				Object.keys($input.item.json).length + extensions('object').length,
			);
		});

		test("should return completions for: '{{ $input.first().| }}'", () => {
			resolveParameterSpy.mockReturnValue($input.first().json);

			expect(completions('{{ $input.first().| }}')).toHaveLength(
				Object.keys($input.first().json).length + extensions('object').length,
			);
		});

		test("should return completions for: '{{ $input.last().| }}'", () => {
			resolveParameterSpy.mockReturnValue($input.last().json);

			expect(completions('{{ $input.last().| }}')).toHaveLength(
				Object.keys($input.last().json).length + extensions('object').length,
			);
		});

		test("should return completions for: '{{ $input.all()[0].| }}'", () => {
			resolveParameterSpy.mockReturnValue($input.all()[0].json);

			expect(completions('{{ $input.all()[0].| }}')).toHaveLength(
				Object.keys($input.all()[0].json).length + extensions('object').length,
			);
		});

		test('should return completions for: {{ $input.item.json.str.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.str);

			expect(completions('{{ $input.item.json.str.| }}')).toHaveLength(extensions('string').length);
		});

		test('should return completions for: {{ $input.item.json.num.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.num);

			expect(completions('{{ $input.item.json.num.| }}')).toHaveLength(extensions('number').length);
		});

		test('should return completions for: {{ $input.item.json.arr.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.arr);

			expect(completions('{{ $input.item.json.arr.| }}')).toHaveLength(extensions('array').length);
		});

		test('should return completions for: {{ $input.item.json.obj.| }}', () => {
			resolveParameterSpy.mockReturnValue($input.item.json.obj);

			expect(completions('{{ $input.item.json.obj.| }}')).toHaveLength(
				Object.keys($input.item.json.obj).length + extensions('object').length,
			);
		});
	});

	describe('bracket access', () => {
		const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');
		const { $input } = mockProxy;

		['{{ $input.item.json[| }}', '{{ $json[| }}'].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				resolveParameterSpy.mockReturnValue($input.item.json);

				const found = completions(expression);

				if (!found) throw new Error('Expected to find completions');

				expect(found).toHaveLength(Object.keys($input.item.json).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});

		["{{ $input.item.json['obj'][| }}", "{{ $json['obj'][| }}"].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				resolveParameterSpy.mockReturnValue($input.item.json.obj);

				const found = completions(expression);

				if (!found) throw new Error('Expected to find completions');

				expect(found).toHaveLength(Object.keys($input.item.json.obj).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});
	});
});

export function completions(docWithCursor: string) {
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
