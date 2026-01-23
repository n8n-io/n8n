import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { DateTime } from 'luxon';

import * as workflowHelpers from '@/app/composables/useWorkflowHelpers';
import * as utils from '@/features/shared/editors/plugins/codemirror/completions/utils';
import {
	extensions,
	luxonInstanceOptions,
	luxonStaticOptions,
	natives,
} from '@/features/shared/editors/plugins/codemirror/completions/datatype.completions';

import { mockProxy } from './__tests__/mock';
import type { CompletionSource, CompletionResult } from '@codemirror/autocomplete';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { EnterpriseEditionFeature } from '@/app/constants';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import {
	ARRAY_NUMBER_ONLY_METHODS,
	LUXON_RECOMMENDED_OPTIONS,
	METADATA_SECTION,
	METHODS_SECTION,
	RECOMMENDED_SECTION,
	STRING_RECOMMENDED_OPTIONS,
} from './constants';
import set from 'lodash/set';
import uniqBy from 'lodash/uniqBy';
import { mockNodes } from '@/__tests__/mocks';

let externalSecretsStore: ReturnType<typeof useExternalSecretsStore>;
let uiStore: ReturnType<typeof useUIStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;

beforeEach(async () => {
	setActivePinia(createTestingPinia());

	externalSecretsStore = useExternalSecretsStore();
	uiStore = useUIStore();
	settingsStore = useSettingsStore();

	vi.spyOn(utils, 'receivesNoBinaryData').mockResolvedValue(true); // hide $binary
	vi.spyOn(utils, 'isSplitInBatchesAbsent').mockReturnValue(false); // show context
	vi.spyOn(utils, 'hasActiveNode').mockReturnValue(true);
});

describe('No completions', () => {
	test('should not return completions mid-word: {{ "ab|c" }}', async () => {
		expect(await completions('{{ "ab|c" }}')).toBeNull();
	});

	test('should not return completions for isolated dot: {{ "abc. |" }}', async () => {
		expect(await completions('{{ "abc. |" }}')).toBeNull();
	});
});

describe('Top-level completions', () => {
	test('should return dollar completions for blank position: {{ | }}', async () => {
		const result = await completions('{{ | }}');
		expect(result).toHaveLength(19);

		expect(result?.[0]).toEqual(
			expect.objectContaining({
				label: '$json',
				section: RECOMMENDED_SECTION,
			}),
		);
		expect(result?.[4]).toEqual(
			expect.objectContaining({
				label: '$execution',
				section: METADATA_SECTION,
			}),
		);
		expect(result?.[15]).toEqual(
			expect.objectContaining({ label: '$max()', section: METHODS_SECTION }),
		);
	});

	test('should return DateTime completion for: {{ D| }}', async () => {
		const found = await completions('{{ D| }}');

		if (!found) throw new Error('Expected to find completion');

		expect(found).toHaveLength(1);
		expect(found[0].label).toBe('DateTime');
	});

	test('should return Math completion for: {{ M| }}', async () => {
		const found = await completions('{{ M| }}');

		if (!found) throw new Error('Expected to find completion');

		expect(found).toHaveLength(1);
		expect(found[0].label).toBe('Math');
	});

	test('should return Object completion for: {{ O| }}', async () => {
		const found = await completions('{{ O| }}');

		if (!found) throw new Error('Expected to find completion');

		expect(found).toHaveLength(1);
		expect(found[0].label).toBe('Object');
	});

	test('should return dollar completions for: {{ $| }}', async () => {
		expect(await completions('{{ $| }}')).toHaveLength(19);
	});

	test('should return node selector completions for: {{ $(| }}', async () => {
		vi.spyOn(utils, 'autocompletableNodeNames').mockReturnValue(mockNodes.map((node) => node.name));

		expect(await completions('{{ $(| }}')).toHaveLength(mockNodes.length);
	});
});

describe('Luxon method completions', () => {
	test('should return class completions for: {{ DateTime.| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(DateTime);

		expect(await completions('{{ DateTime.| }}')).toHaveLength(luxonStaticOptions().length);
	});

	test('should return instance completions for: {{ $now.| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(DateTime.now());

		expect(await completions('{{ $now.| }}')).toHaveLength(
			uniqBy(
				luxonInstanceOptions().concat(extensions({ typeName: 'date' })),
				(option) => option.label,
			).length + LUXON_RECOMMENDED_OPTIONS.length,
		);
	});

	test('should return instance completions for: {{ $today.| }}', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(DateTime.now());

		expect(await completions('{{ $today.| }}')).toHaveLength(
			uniqBy(
				luxonInstanceOptions().concat(extensions({ typeName: 'date' })),
				(option) => option.label,
			).length + LUXON_RECOMMENDED_OPTIONS.length,
		);
	});
});

describe('Resolution-based completions', () => {
	describe('literals', () => {
		test('should return completions for string literal: {{ "abc".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('abc');

			expect(await completions('{{ "abc".| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});

		test('should return completions for boolean literal: {{ true.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(true);

			expect(await completions('{{ true.| }}')).toHaveLength(
				natives({ typeName: 'boolean' }).length + extensions({ typeName: 'boolean' }).length,
			);
		});

		test('should properly handle string that contain dollar signs', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce("You 'owe' me 200$ ");

			const result = await completions('{{ "You \'owe\' me 200$".| }}');

			expect(result).toHaveLength(
				natives({ typeName: 'string' }).length + extensions({ typeName: 'string' }).length + 1,
			);
		});

		test('should return completions for number literal: {{ (123).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(123);

			expect(await completions('{{ (123).| }}')).toHaveLength(
				natives({ typeName: 'number' }).length +
					extensions({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
		});

		test('should return completions for array literal: {{ [1, 2, 3].| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce([1, 2, 3]);

			expect(await completions('{{ [1, 2, 3].| }}')).toHaveLength(
				natives({ typeName: 'array' }).length + extensions({ typeName: 'array' }).length,
			);
		});

		test('should return completions for Object methods: {{ Object.values({ abc: 123 }).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce([123]);

			const found = await completions('{{ Object.values({ abc: 123 }).| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(
				natives({ typeName: 'array' }).length + extensions({ typeName: 'array' }).length,
			);
		});

		test('should return completions for object literal', async () => {
			const object = { a: 1 };

			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(object);

			expect(await completions('{{ ({ a: 1 }).| }}')).toHaveLength(
				Object.keys(object).length + extensions({ typeName: 'object' }).length,
			);
		});

		test('should return case-insensitive completions', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('abc');

			const result = await completions('{{ "abc".tolowerca| }}');
			expect(result).toHaveLength(1);
			expect(result?.at(0)).toEqual(expect.objectContaining({ label: 'toLowerCase()' }));
		});
	});

	describe('indexed access completions', () => {
		test('should return string completions for indexed access that resolves to string literal: {{ "abc"[0].| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('a');

			expect(await completions('{{ "abc"[0].| }}')).toHaveLength(
				natives({ typeName: 'string' }).length +
					extensions({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('complex expression completions', () => {
		const { $input } = mockProxy;

		test('should return completions when $input is used as a function parameter', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.num);
			const found = await completions('{{ Math.abs($input.item.json.num1).| }}');
			if (!found) throw new Error('Expected to find completions');
			expect(found).toHaveLength(
				extensions({ typeName: 'number' }).length +
					natives({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
		});

		test('should return completions when node reference is used as a function parameter', async () => {
			const initialState = { workflows: { workflow: { nodes: mockNodes } } };

			setActivePinia(createTestingPinia({ initialState }));

			expect(await completions('{{ new Date($(|) }}')).toHaveLength(mockNodes.length);
		});

		test('should return completions for complex expression: {{ $now.diff($now.diff($now.|)) }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(DateTime.now());
			expect(await completions('{{ $now.diff($now.diff($now.|)) }}')).toHaveLength(
				uniqBy(
					luxonInstanceOptions().concat(extensions({ typeName: 'date' })),
					(option) => option.label,
				).length + LUXON_RECOMMENDED_OPTIONS.length,
			);
		});

		test('should return completions for complex expression: {{ $execution.resumeUrl.includes($json.) }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce($input.item?.json);
			const { $json } = mockProxy;
			const found = await completions('{{ $execution.resumeUrl.includes($json.|) }}');

			if (!found) throw new Error('Expected to find completions');
			expect(found).toHaveLength(
				Object.keys($json).length + extensions({ typeName: 'object' }).length,
			);
		});

		test('should return completions for operation expression: {{ $now.day + $json. }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce($input.item?.json);
			const { $json } = mockProxy;
			const found = await completions('{{ $now.day + $json.| }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(
				Object.keys($json).length + extensions({ typeName: 'object' }).length,
			);
		});

		test('should return completions for operation expression: {{ Math.abs($now.day) >= 10 ? $now : Math.abs($json.). }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json);
			const { $json } = mockProxy;
			const found = await completions('{{ Math.abs($now.day) >= 10 ? $now : Math.abs($json.|) }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(
				Object.keys($json).length + extensions({ typeName: 'object' }).length,
			);
		});
	});

	describe('bracket-aware completions', () => {
		const { $input } = mockProxy;

		test('should return bracket-aware completions for: {{ $input.item.json.str.|() }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.str);

			const found = await completions('{{ $input.item.json.str.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(
				extensions({ typeName: 'string' }).length +
					natives({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});

		test('should return bracket-aware completions for: {{ $input.item.json.num.|() }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.num);

			const found = await completions('{{ $input.item.json.num.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(
				extensions({ typeName: 'number' }).length +
					natives({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});

		test('should return bracket-aware completions for: {{ $input.item.json.arr.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.arr);

			const found = await completions('{{ $input.item.json.arr.|() }}');

			if (!found) throw new Error('Expected to find completions');

			expect(found).toHaveLength(
				extensions({ typeName: 'array' }).length + natives({ typeName: 'array' }).length,
			);
			expect(found.map((c) => c.label).every((l) => !l.endsWith('()')));
		});
	});

	describe('secrets', () => {
		const { $input } = mockProxy;

		test('should return completions for: {{ $secrets.| }}', async () => {
			const provider = 'infisical';
			const secrets = ['SECRET'];

			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input);

			uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = true;
			set(settingsStore.settings, ['enterprise', EnterpriseEditionFeature.ExternalSecrets], true);
			externalSecretsStore.state.secrets = {
				[provider]: secrets,
			};

			const result = await completions('{{ $secrets.| }}');

			expect(result).toEqual([
				{
					info: expect.any(Function),
					label: provider,
					apply: expect.any(Function),
				},
			]);
		});

		test('should return completions for: {{ $secrets.provider.| }}', async () => {
			const provider = 'infisical';
			const secrets = ['SECRET1', 'SECRET2'];

			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input);

			uiStore.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = true;
			set(settingsStore.settings, ['enterprise', EnterpriseEditionFeature.ExternalSecrets], true);
			externalSecretsStore.state.secrets = {
				[provider]: secrets,
			};

			const result = await completions(`{{ $secrets.${provider}.| }}`);

			expect(result).toEqual([
				{
					info: expect.any(Function),
					label: secrets[0],
					apply: expect.any(Function),
				},
				{
					info: expect.any(Function),
					label: secrets[1],
					apply: expect.any(Function),
				},
			]);
		});
	});

	describe('references', () => {
		const { $input, $ } = mockProxy;

		test('should return completions for: {{ $input.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input);

			const result = await completions('{{ $input.| }}');
			// inputOptions returns completions for $input references
			// All completions that match keys in the proxy are returned
			expect(result).toHaveLength(Reflect.ownKeys($input).length);
		});

		test('should return completions for: {{ "hello"+input.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input);

			expect(await completions('{{ "hello"+$input.| }}')).toHaveLength(
				Reflect.ownKeys($input).length,
			);
		});

		test("should return completions for: {{ $('nodeName').| }}", async () => {
			const nodeRef = $('Rename');
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue(nodeRef);

			// nodeRefOptions returns completions for node references
			// Subtract 1 for 'pairedItem' which is always filtered
			expect(await completions('{{ $("Rename").| }}')).toHaveLength(
				Reflect.ownKeys(nodeRef).length - ['pairedItem'].length,
			);
		});

		test("should return completions for: {{ $('(Complex) \"No\\'de\" name').| }}", async () => {
			const nodeRef = $('Rename');
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue(nodeRef);

			// Subtract 1 for 'pairedItem' which is always filtered
			expect(await completions("{{ $('(Complex) \"No\\'de\" name').| }}")).toHaveLength(
				Reflect.ownKeys(nodeRef).length - ['pairedItem'].length,
			);
		});

		test('should return completions for: {{ $input.item.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item);

			const found = await completions('{{ $input.item.| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return completions for: {{ $input.first().| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.first());

			const found = await completions('{{ $input.first().| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return completions for: {{ $input.last().| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.last());

			const found = await completions('{{ $input.last().| }}');

			if (!found) throw new Error('Expected to find completion');

			expect(found).toHaveLength(1);
			expect(found[0].label).toBe('json');
		});

		test('should return completions for: {{ $input.all().| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue([$input.item]);

			expect(await completions('{{ $input.all().| }}')).toHaveLength(
				extensions({ typeName: 'array' }).length +
					natives({ typeName: 'array' }).length -
					ARRAY_NUMBER_ONLY_METHODS.length,
			);
		});

		test("should return completions for: '{{ $input.item.| }}'", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json);

			expect(await completions('{{ $input.item.| }}')).toHaveLength(
				Object.keys($input.item?.json ?? {}).length + extensions({ typeName: 'object' }).length,
			);
		});

		test("should return completions for: '{{ $input.first().| }}'", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.first()?.json);

			expect(await completions('{{ $input.first().| }}')).toHaveLength(
				Object.keys($input.first()?.json ?? {}).length + extensions({ typeName: 'object' }).length,
			);
		});

		test("should return completions for: '{{ $input.last().| }}'", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.last()?.json);

			expect(await completions('{{ $input.last().| }}')).toHaveLength(
				Object.keys($input.last()?.json ?? {}).length + extensions({ typeName: 'object' }).length,
			);
		});

		test("should return completions for: '{{ $input.all()[0].| }}'", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.all()[0].json);

			expect(await completions('{{ $input.all()[0].| }}')).toHaveLength(
				Object.keys($input.all()[0].json).length + extensions({ typeName: 'object' }).length,
			);
		});

		test('should return completions for: {{ $input.item.json.str.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.str);

			expect(await completions('{{ $input.item.json.str.| }}')).toHaveLength(
				extensions({ typeName: 'string' }).length +
					natives({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});

		test('should return completions for: {{ $input.item.json.num.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.num);

			expect(await completions('{{ $input.item.json.num.| }}')).toHaveLength(
				extensions({ typeName: 'number' }).length +
					natives({ typeName: 'number' }).length +
					['isEven()', 'isOdd()'].length,
			);
		});

		test('should return completions for: {{ $input.item.json.arr.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.arr);

			expect(await completions('{{ $input.item.json.arr.| }}')).toHaveLength(
				extensions({ typeName: 'array' }).length + natives({ typeName: 'array' }).length,
			);
		});

		test('should return completions for: {{ $input.item.json.obj.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.obj);

			expect(await completions('{{ $input.item.json.obj.| }}')).toHaveLength(
				Object.keys($input.item?.json.obj ?? {}).length + extensions({ typeName: 'object' }).length,
			);
		});
	});

	describe('bracket access', () => {
		const { $input } = mockProxy;

		['{{ $input.item.json[| }}', '{{ $json[| }}'].forEach((expression) => {
			test(`should return completions for: ${expression}`, async () => {
				vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json);

				const found = await completions(expression);

				if (!found) throw new Error('Expected to find completions');

				expect(found).toHaveLength(Object.keys($input.item?.json ?? {}).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});

		["{{ $input.item.json['obj'][| }}", "{{ $json['obj'][| }}"].forEach((expression) => {
			test(`should return completions for: ${expression}`, async () => {
				vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue($input.item?.json.obj);

				const found = await completions(expression);

				if (!found) throw new Error('Expected to find completions');

				expect(found).toHaveLength(Object.keys($input.item?.json.obj ?? {}).length);
				expect(found.map((c) => c.label).every((l) => l.endsWith(']')));
			});
		});

		test('should give completions for keys that need bracket access', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue({
				foo: 'bar',
				'Key with spaces': 1,
				'Key with spaces and \'quotes"': 1,
			});

			const found = await completions('{{ $json.| }}');
			if (!found) throw new Error('Expected to find completions');
			expect(found).toContainEqual(
				expect.objectContaining({
					label: 'Key with spaces',
					apply: utils.applyBracketAccessCompletion,
				}),
			);
			expect(found).toContainEqual(
				expect.objectContaining({
					label: 'Key with spaces and \'quotes"',
					apply: utils.applyBracketAccessCompletion,
				}),
			);
		});

		test('should escape keys with quotes', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue({
				'Key with spaces and \'quotes"': 1,
			});

			const found = await completions('{{ $json[| }}');
			if (!found) throw new Error('Expected to find completions');
			expect(found).toContainEqual(
				expect.objectContaining({
					label: "'Key with spaces and \\'quotes\"']",
				}),
			);
		});
	});

	describe('recommended completions', () => {
		test('should recommend toDateTime() for {{ "1-Feb-2024".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('1-Feb-2024');

			expect((await completions('{{ "1-Feb-2024".| }}'))?.[0]).toEqual(
				expect.objectContaining({ label: 'toDateTime()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend toNumber() for: {{ "5.3".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('5.3');
			const options = await completions('{{ "5.3".| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'toNumber()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend extractEmail() for: {{ "string with test@n8n.io in it".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(
				'string with test@n8n.io in it',
			);
			const options = await completions('{{ "string with test@n8n.io in it".| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'extractEmail()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend extractDomain(), isEmail() for: {{ "test@n8n.io".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('test@n8n.io');
			const options = await completions('{{ "test@n8n.io".| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'extractDomain()', section: RECOMMENDED_SECTION }),
			);
			expect(options?.[1]).toEqual(
				expect.objectContaining({ label: 'isEmail()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend extractDomain(), extractUrlPath() for: {{ "https://n8n.io/pricing".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('https://n8n.io/pricing');
			const options = await completions('{{ "https://n8n.io/pricing".| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'extractDomain()', section: RECOMMENDED_SECTION }),
			);
			expect(options?.[1]).toEqual(
				expect.objectContaining({ label: 'extractUrlPath()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend round(),floor(),ceil() for: {{ (5.46).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(5.46);
			const options = await completions('{{ (5.46).| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'round()', section: RECOMMENDED_SECTION }),
			);
			expect(options?.[1]).toEqual(
				expect.objectContaining({ label: 'floor()', section: RECOMMENDED_SECTION }),
			);
			expect(options?.[2]).toEqual(
				expect.objectContaining({ label: 'ceil()', section: RECOMMENDED_SECTION }),
			);
		});

		test("should recommend toDateTime('s') for: {{ (1900062210).| }}", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(1900062210);
			const options = await completions('{{ (1900062210).| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: "toDateTime('s')", section: RECOMMENDED_SECTION }),
			);
		});

		test("should recommend toDateTime('ms') for: {{ (1900062210000).| }}", async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(1900062210000);
			const options = await completions('{{ (1900062210000).| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: "toDateTime('ms')", section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend toBoolean() for: {{ (0).| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce(0);
			const options = await completions('{{ (0).| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'toBoolean()', section: RECOMMENDED_SECTION }),
			);
		});

		test('should recommend toBoolean() for: {{ "true".| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce('true');
			const options = await completions('{{ "true".| }}');
			expect(options?.[0]).toEqual(
				expect.objectContaining({ label: 'toBoolean()', section: RECOMMENDED_SECTION }),
			);
		});
	});

	describe('explicit completions (opened by Ctrl+Space or programatically)', () => {
		test('should return completions for: {{ $json.foo| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter')
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce('foo');

			const result = await completions('{{ $json.foo| }}', true);
			expect(result).toHaveLength(
				extensions({ typeName: 'string' }).length +
					natives({ typeName: 'string' }).length +
					STRING_RECOMMENDED_OPTIONS.length,
			);
		});
	});

	describe('type information', () => {
		test('should display type information for: {{ $json.obj.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce({
				str: 'bar',
				empty: null,
				arr: [],
				obj: {},
			});

			const result = await completions('{{ $json.obj.| }}');
			expect(result).toContainEqual(expect.objectContaining({ label: 'str', detail: 'string' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'empty', detail: 'null' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'arr', detail: 'Array' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'obj', detail: 'Object' }));
		});

		test('should display type information for: {{ $input.item.json.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce({
				str: 'bar',
				empty: null,
				arr: [],
				obj: {},
			});

			const result = await completions('{{ $json.item.json.| }}');
			expect(result).toContainEqual(expect.objectContaining({ label: 'str', detail: 'string' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'empty', detail: 'null' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'arr', detail: 'Array' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'obj', detail: 'Object' }));
		});

		test('should display type information for: {{ $("My Node").item.json.| }}', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValueOnce({
				str: 'bar',
				empty: null,
				arr: [],
				obj: {},
			});

			const result = await completions('{{ $("My Node").item.json.| }}');
			expect(result).toContainEqual(expect.objectContaining({ label: 'str', detail: 'string' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'empty', detail: 'null' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'arr', detail: 'Array' }));
			expect(result).toContainEqual(expect.objectContaining({ label: 'obj', detail: 'Object' }));
		});

		test('should not display type information for other completions', async () => {
			vi.spyOn(workflowHelpers, 'resolveParameter').mockResolvedValue({
				str: 'bar',
				id: '123',
				isExecuted: false,
			});

			expect(await completions('{{ $execution.| }}')).not.toContainEqual(
				expect.objectContaining({ detail: expect.any(String) }),
			);
			expect(await completions('{{ $input.params.| }}')).not.toContainEqual(
				expect.objectContaining({ detail: expect.any(String) }),
			);
			expect(await completions('{{ $("My Node").| }}')).not.toContainEqual(
				expect.objectContaining({ detail: expect.any(String) }),
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
