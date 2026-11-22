import type { CustomActionDraft, CustomActionInput, CustomActionRequest } from '@n8n/api-types';
import { UnexpectedError } from '@n8n/errors';

import { classifyEdit, joinDraft, splitDraft } from '../edit-classifier';

const base: CustomActionDraft = {
	name: 'Get invoice',
	description: 'Reads one invoice',
	inputs: [
		{
			name: 'invoiceId',
			displayName: 'Invoice ID',
			type: 'string',
			required: true,
			target: 'url',
			key: 'invoiceId',
		},
		{
			name: 'currency',
			displayName: 'Currency',
			type: 'options',
			options: [
				{ name: 'Euro', value: 'eur' },
				{ name: 'Dollar', value: 'usd' },
			],
			required: false,
			default: 'eur',
			target: 'query',
			key: 'currency',
		},
	],
	request: {
		method: 'GET',
		url: '/v1/invoices/{invoiceId}',
		headers: { 'X-Api-Version': '1', Accept: 'application/json' },
		query: { expand: 'lines', limit: '10' },
		bodyType: 'none',
		body: {},
	},
};

const meta = { name: base.name, description: base.description };

const withInput = (index: number, patch: Partial<CustomActionInput>): CustomActionDraft => ({
	...base,
	inputs: base.inputs.map((input, i) => (i === index ? { ...input, ...patch } : input)),
});
const withRequest = (patch: Partial<CustomActionRequest>): CustomActionDraft => ({
	...base,
	request: { ...base.request, ...patch },
});
const reorderInputs = (draft: CustomActionDraft): CustomActionDraft => ({
	...draft,
	inputs: [...draft.inputs].reverse(),
});
const addInput = (draft: CustomActionDraft, input: CustomActionInput): CustomActionDraft => ({
	...draft,
	inputs: [...draft.inputs, input],
});
const removeInput = (draft: CustomActionDraft, index: number): CustomActionDraft => ({
	...draft,
	inputs: draft.inputs.filter((_, i) => i !== index),
});
const withOptionValue = (
	draft: CustomActionDraft,
	from: string,
	to: string,
): CustomActionDraft => ({
	...draft,
	inputs: draft.inputs.map((input) => ({
		...input,
		options: input.options?.map((o) => (o.value === from ? { ...o, value: to } : o)),
	})),
});
const bodyInput = (name: string): CustomActionInput => ({
	name,
	displayName: name,
	type: 'string',
	required: false,
	target: 'body',
	key: name,
});
const withInputAndRequest: CustomActionDraft = {
	...withInput(0, { required: false }),
	request: { ...base.request, url: '/v2/invoices/{invoiceId}' },
};

describe('classifyEdit', () => {
	it('returns none for an identical draft', () => {
		expect(classifyEdit(base, base)).toBe('none');
	});

	it('returns none for a deep copy', () => {
		expect(classifyEdit(base, structuredClone(base))).toBe('none');
	});

	it('returns cosmetic when the action name changes', () => {
		expect(classifyEdit(base, { ...base, name: 'Renamed' })).toBe('cosmetic');
	});

	it('returns cosmetic when the action description changes', () => {
		expect(classifyEdit(base, { ...base, description: 'Other' })).toBe('cosmetic');
	});

	it('treats an undefined description and a missing description as equal', () => {
		const { description: _omit, ...without } = base;
		expect(classifyEdit(without, { ...without, description: undefined })).toBe('none');
	});

	it('returns cosmetic when an input display name changes', () => {
		expect(classifyEdit(base, withInput(0, { displayName: 'Invoice' }))).toBe('cosmetic');
	});

	it('returns cosmetic when an input description changes', () => {
		expect(classifyEdit(base, withInput(0, { description: 'New text' }))).toBe('cosmetic');
	});

	it('returns cosmetic when inputs are reordered', () => {
		expect(classifyEdit(base, reorderInputs(base))).toBe('cosmetic');
	});

	it('returns cosmetic when an option name changes', () => {
		const next = withInput(1, {
			options: [
				{ name: 'EUR', value: 'eur' },
				{ name: 'Dollar', value: 'usd' },
			],
		});
		expect(classifyEdit(base, next)).toBe('cosmetic');
	});

	describe('option order', () => {
		const euroFirst = [
			{ name: 'Euro', value: 'eur' },
			{ name: 'Dollar', value: 'usd' },
		];
		const dollarFirst = [
			{ name: 'Dollar', value: 'usd' },
			{ name: 'Euro', value: 'eur' },
		];
		const pound = { name: 'Pound', value: 'gbp' };
		const noDefault = withInput(1, { default: undefined, options: euroFirst });

		it('returns cosmetic for a reorder when an explicit default keeps the effective default', () => {
			expect(classifyEdit(base, withInput(1, { options: dollarFirst }))).toBe('cosmetic');
		});

		it('returns version for a reorder that changes the first option without a default', () => {
			const next = withInput(1, { default: undefined, options: dollarFirst });
			expect(classifyEdit(noDefault, next)).toBe('version');
		});

		it('returns version for a reorder with a request change that changes the effective default', () => {
			const next: CustomActionDraft = {
				...withInput(1, { default: undefined, options: dollarFirst }),
				request: { ...base.request, url: '/v2/invoices/{invoiceId}' },
			};
			expect(classifyEdit(noDefault, next)).toBe('version');
		});

		it('returns cosmetic for a reorder that keeps the first option without a default', () => {
			const current = withInput(1, { default: undefined, options: [...euroFirst, pound] });
			const next = withInput(1, {
				default: undefined,
				options: [euroFirst[0], pound, euroFirst[1]],
			});
			expect(classifyEdit(current, next)).toBe('cosmetic');
		});

		it('returns cosmetic for an explicit default equal to the first option', () => {
			expect(classifyEdit(noDefault, withInput(1, { default: 'eur', options: euroFirst }))).toBe(
				'cosmetic',
			);
		});
	});

	it('returns revision when the url changes', () => {
		expect(classifyEdit(base, withRequest({ url: '/v2/invoices/{invoiceId}' }))).toBe('revision');
	});

	it('returns revision when a fixed header changes', () => {
		expect(classifyEdit(base, withRequest({ headers: { 'X-Api-Version': '2' } }))).toBe('revision');
	});

	it('returns revision when the method changes', () => {
		expect(classifyEdit(base, withRequest({ method: 'POST' }))).toBe('revision');
	});

	it('returns none when only the key order of headers and query changes', () => {
		const next = withRequest({
			headers: { Accept: 'application/json', 'X-Api-Version': '1' },
			query: { limit: '10', expand: 'lines' },
		});
		expect(classifyEdit(base, next)).toBe('none');
	});

	it('returns revision when the array order inside the body changes', () => {
		const a = withRequest({ bodyType: 'json', body: { tags: ['a', 'b'] } });
		const b = withRequest({ bodyType: 'json', body: { tags: ['b', 'a'] } });
		expect(classifyEdit(a, b)).toBe('revision');
	});

	it('returns revision when the key of an input changes', () => {
		expect(classifyEdit(base, withInput(0, { key: 'other.path' }))).toBe('revision');
	});

	it('returns revision when the target of an input changes', () => {
		expect(classifyEdit(base, withInput(1, { target: 'header' }))).toBe('revision');
	});

	it('returns version when an input becomes optional', () => {
		expect(classifyEdit(base, withInput(0, { required: false }))).toBe('version');
	});

	it('returns version when an input type changes', () => {
		expect(classifyEdit(base, withInput(0, { type: 'number' }))).toBe('version');
	});

	it('returns version when a default is added', () => {
		expect(classifyEdit(base, withInput(0, { default: 5 }))).toBe('version');
	});

	it('returns version when a default changes', () => {
		expect(classifyEdit(base, withInput(1, { default: 'usd' }))).toBe('version');
	});

	it('treats an undefined default and a missing default as equal', () => {
		expect(classifyEdit(base, withInput(0, { default: undefined }))).toBe('none');
	});

	it('treats the number 1 and the string "1" as different defaults', () => {
		const a = withInput(0, { default: 1 });
		const b = withInput(0, { default: '1' });
		expect(classifyEdit(a, b)).toBe('version');
	});

	it('returns version when an input is added', () => {
		expect(classifyEdit(base, addInput(base, bodyInput('memo')))).toBe('version');
	});

	it('returns version when an input is removed', () => {
		expect(classifyEdit(base, removeInput(base, 0))).toBe('version');
	});

	it('returns version when an input is renamed', () => {
		expect(classifyEdit(base, withInput(0, { name: 'invoiceNumber' }))).toBe('version');
	});

	it('returns version when an option value changes', () => {
		expect(classifyEdit(base, withOptionValue(base, 'eur', 'EUR'))).toBe('version');
	});

	it('returns version when an option value is added', () => {
		const next = withInput(1, {
			options: [...(base.inputs[1].options ?? []), { name: 'Pound', value: 'gbp' }],
		});
		expect(classifyEdit(base, next)).toBe('version');
	});

	it('ignores options on an input that is not of type options', () => {
		const next = withInput(0, { options: [{ name: 'A', value: 'a' }] });
		expect(classifyEdit(base, next)).toBe('none');
	});

	it('returns version when a contract change comes with a request change', () => {
		expect(classifyEdit(base, withInputAndRequest)).toBe('version');
	});
});

describe('splitDraft and joinDraft', () => {
	it('restores the exact draft after a round trip', () => {
		const { inputs, request } = splitDraft(base);
		expect(joinDraft(meta, inputs, request)).toEqual(base);
	});

	it('moves target and key into inputTargets', () => {
		const { inputs, request } = splitDraft(base);
		expect(request.inputTargets).toEqual({
			invoiceId: { target: 'url', key: 'invoiceId' },
			currency: { target: 'query', key: 'currency' },
		});
		expect(inputs[0]).not.toHaveProperty('target');
		expect(inputs[0]).not.toHaveProperty('key');
		expect(inputs.map((i) => i.name)).toEqual(['invoiceId', 'currency']);
	});

	it('round-trips a draft without a description', () => {
		const { description: _omit, ...without } = base;
		const { inputs, request } = splitDraft(without);
		expect(joinDraft({ name: without.name }, inputs, request)).toEqual(without);
	});

	it('throws UnexpectedError when inputTargets has no entry for an input', () => {
		const { inputs, request } = splitDraft(base);
		const broken = { ...request, inputTargets: { invoiceId: request.inputTargets.invoiceId } };
		expect(() => joinDraft(meta, inputs, broken)).toThrow(UnexpectedError);
	});
});
