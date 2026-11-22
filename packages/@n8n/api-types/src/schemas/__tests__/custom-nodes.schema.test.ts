import {
	CreateCustomNodeDto,
	SetCustomNodeIconDto,
	UpdateCustomNodeDto,
} from '../../dto/custom-nodes/custom-nodes.dto';
import {
	customActionDraftSchema,
	customActionRequestSchema,
	customNodeAuthSchema,
	CUSTOM_DEFINITIONS_PACKAGE_NAME,
} from '../custom-nodes.schema';

const minimalDraft = {
	name: 'Get invoice',
	inputs: [],
	request: { method: 'GET', url: 'https://api.example.com/invoices' },
};

describe('custom-nodes.schema', () => {
	it('exports the package name', () => {
		expect(CUSTOM_DEFINITIONS_PACKAGE_NAME).toBe('n8n-custom');
	});

	it('accepts a minimal draft', () => {
		expect(customActionDraftSchema.safeParse(minimalDraft).success).toBe(true);
	});

	it('fills defaults for headers, query, bodyType and body', () => {
		const result = customActionRequestSchema.parse(minimalDraft.request);
		expect(result.headers).toEqual({});
		expect(result.query).toEqual({});
		expect(result.body).toEqual({});
		expect(result.bodyType).toBe('none');
	});

	it('rejects an input name that is not a camelCase identifier', () => {
		const draft = {
			...minimalDraft,
			inputs: [
				{
					name: 'Invoice-Id',
					displayName: 'Invoice ID',
					type: 'string',
					required: true,
					target: 'url',
					key: 'id',
				},
			],
		};
		expect(customActionDraftSchema.safeParse(draft).success).toBe(false);
		draft.inputs[0].name = 'invoiceId';
		expect(customActionDraftSchema.safeParse(draft).success).toBe(true);
	});

	it('rejects more than 50 inputs', () => {
		const input = (i: number) => ({
			name: `input${i}`,
			displayName: 'Input',
			type: 'string',
			required: false,
			target: 'query',
			key: `k${i}`,
		});
		const make = (n: number) => ({
			...minimalDraft,
			inputs: Array.from({ length: n }, (_, i) => input(i)),
		});
		expect(customActionDraftSchema.safeParse(make(50)).success).toBe(true);
		expect(customActionDraftSchema.safeParse(make(51)).success).toBe(false);
	});

	it('rejects an unknown generic auth type', () => {
		expect(customNodeAuthSchema.safeParse({ kind: 'generic', type: 'oauth9' }).success).toBe(false);
		expect(
			customNodeAuthSchema.safeParse({ kind: 'generic', type: 'httpHeaderAuth' }).success,
		).toBe(true);
	});

	it('rejects an icon that is not a PNG or SVG data URI', () => {
		expect(
			SetCustomNodeIconDto.safeParse({ iconDataUri: 'data:text/html;base64,AAAA' }).success,
		).toBe(false);
		expect(
			SetCustomNodeIconDto.safeParse({ iconDataUri: 'data:image/png;base64,AAAA' }).success,
		).toBe(true);
	});

	describe('size limits', () => {
		const request = (patch: Record<string, unknown>) =>
			customActionRequestSchema.safeParse({ ...minimalDraft.request, ...patch }).success;
		const entries = (n: number) =>
			Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, 'v']));
		const optionsInput = (options: unknown[]) =>
			customActionDraftSchema.safeParse({
				...minimalDraft,
				inputs: [
					{
						name: 'speed',
						displayName: 'Speed',
						type: 'options',
						options,
						required: false,
						target: 'query',
						key: 'speed',
					},
				],
			}).success;
		const node = (patch: Record<string, unknown>) =>
			CreateCustomNodeDto.safeParse({
				displayName: 'Acme',
				baseUrl: 'https://api.example.com',
				auth: { kind: 'none' },
				actions: [minimalDraft],
				...patch,
			}).success;

		it('limits the URL to 2048 characters', () => {
			const url = (length: number) => `https://a.test/${'x'.repeat(length - 15)}`;
			expect(request({ url: url(2048) })).toBe(true);
			expect(request({ url: url(2049) })).toBe(false);
		});

		it.each(['headers', 'query'])('limits %s to 50 entries', (field) => {
			expect(request({ [field]: entries(50) })).toBe(true);
			expect(request({ [field]: entries(51) })).toBe(false);
		});

		it.each(['headers', 'query'])('limits the keys and values of %s', (field) => {
			expect(request({ [field]: { ['k'.repeat(256)]: 'v'.repeat(4096) } })).toBe(true);
			expect(request({ [field]: { ['k'.repeat(257)]: 'v' } })).toBe(false);
			expect(request({ [field]: { k: 'v'.repeat(4097) } })).toBe(false);
		});

		it('limits options to 100 entries with a name and a value of 1 to 256 characters', () => {
			const option = (i: number) => ({ name: `Option ${i}`, value: `o${i}` });
			expect(optionsInput(Array.from({ length: 100 }, (_, i) => option(i)))).toBe(true);
			expect(optionsInput(Array.from({ length: 101 }, (_, i) => option(i)))).toBe(false);
			expect(optionsInput([{ name: '', value: 'a' }])).toBe(false);
			expect(optionsInput([{ name: 'A', value: '' }])).toBe(false);
			expect(optionsInput([{ name: 'n'.repeat(256), value: 'v'.repeat(256) }])).toBe(true);
			expect(optionsInput([{ name: 'n'.repeat(257), value: 'a' }])).toBe(false);
			expect(optionsInput([{ name: 'A', value: 'v'.repeat(257) }])).toBe(false);
		});

		it('limits the base URL to 2048 characters on create and on update', () => {
			const baseUrl = (length: number) => `https://a.test/${'x'.repeat(length - 15)}`;
			expect(node({ baseUrl: baseUrl(2048) })).toBe(true);
			expect(node({ baseUrl: baseUrl(2049) })).toBe(false);
			expect(UpdateCustomNodeDto.safeParse({ baseUrl: baseUrl(2048) }).success).toBe(true);
			expect(UpdateCustomNodeDto.safeParse({ baseUrl: baseUrl(2049) }).success).toBe(false);
		});

		it('limits a new node to 100 actions', () => {
			expect(node({ actions: Array.from({ length: 100 }, () => minimalDraft) })).toBe(true);
			expect(node({ actions: Array.from({ length: 101 }, () => minimalDraft) })).toBe(false);
		});
	});
});
