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
} from '@/plugins/codemirror/completions/datatype.completions';

import { mockNodes, mockProxy } from './mock';
import { completions } from './utils';

beforeEach(() => {
	setActivePinia(createTestingPinia());
	vi.spyOn(utils, 'receivesNoBinaryData').mockReturnValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
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

	test('should return non-dollar completions for: {{ D| }}', () => {
		expect(completions('{{ D| }}')).toHaveLength(1); // DateTime
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

/**
 * @ts-expect-error below is needed as long as `resolveParameter` is mistyped
 */

describe('Luxon method completions', () => {
	const resolveParameterSpy = vi.spyOn(workflowHelpers, 'resolveParameter');

	test('should return class completions for: {{ DateTime.| }}', () => {
		// @ts-expect-error
		resolveParameterSpy.mockReturnValueOnce(DateTime);

		expect(completions('{{ DateTime.| }}')).toHaveLength(luxonStaticOptions().length);
	});

	test('should return instance completions for: {{ $now.| }}', () => {
		// @ts-expect-error
		resolveParameterSpy.mockReturnValueOnce(DateTime.now());

		expect(completions('{{ $now.| }}')).toHaveLength(
			luxonInstanceOptions().length + extensions('date').length,
		);
	});

	test('should return instance completions for: {{ $today.| }}', () => {
		// @ts-expect-error
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
			// @ts-expect-error
			resolveParameterSpy.mockReturnValueOnce('abc');

			expect(completions('{{ "abc".| }}')).toHaveLength(extensions('string').length);
		});

		test('should return completions for number literal: {{ (123).| }}', () => {
			// @ts-expect-error
			resolveParameterSpy.mockReturnValueOnce(123);

			expect(completions('{{ (123).| }}')).toHaveLength(extensions('number').length);
		});

		test('should return completions for array literal: {{ [1, 2, 3].| }}', () => {
			// @ts-expect-error
			resolveParameterSpy.mockReturnValueOnce([1, 2, 3]);

			expect(completions('{{ [1, 2, 3].| }}')).toHaveLength(extensions('array').length);
		});

		test('should return completions for object literal', () => {
			const object = { a: 1 };

			resolveParameterSpy.mockReturnValueOnce(object);

			expect(completions('{{ ({ a: 1 }).| }}')).toHaveLength(
				Object.keys(object).length + extensions('object').length,
			);
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

			expect(completions('{{ $input.item.| }}')).toHaveLength(1); // json
		});

		test('should return completions for: {{ $input.first().| }}', () => {
			resolveParameterSpy.mockReturnValue($input.first());

			expect(completions('{{ $input.first().| }}')).toHaveLength(1); // json
		});

		test('should return completions for: {{ $input.last().| }}', () => {
			resolveParameterSpy.mockReturnValue($input.last());

			expect(completions('{{ $input.last().| }}')).toHaveLength(1); // json
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

				if (!found) throw new Error('Expected to find bracket access completions');

				expect(found).toHaveLength(Object.keys($input.item.json).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});

		["{{ $input.item.json['obj'][| }}", "{{ $json['obj'][| }}"].forEach((expression) => {
			test(`should return completions for: ${expression}`, () => {
				resolveParameterSpy.mockReturnValue($input.item.json.obj);

				const found = completions(expression);

				if (!found) throw new Error('Expected to find bracket access completions');

				expect(found).toHaveLength(Object.keys($input.item.json.obj).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});
	});
});
