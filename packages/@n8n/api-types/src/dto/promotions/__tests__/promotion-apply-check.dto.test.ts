import { promotionBindingWarningSchema } from '../promotion-apply-check.dto';

const consumers = [
	{ project: { id: 'p1', name: 'Alpha' }, workflows: [{ id: 'w1', name: 'Workflow' }] },
];

describe('promotionBindingWarningSchema', () => {
	it('accepts a warning about dropped credential values', () => {
		const warning = promotionBindingWarningSchema.safeParse({
			kind: 'credential',
			code: 'credential-values-dropped',
			sourceId: 'cred-1',
			name: 'GitHub',
			droppedFields: ['password'],
			consumers,
		});

		expect(warning.success).toBe(true);
	});

	it('accepts a variable shadow warning', () => {
		const warning = promotionBindingWarningSchema.safeParse({
			kind: 'variable',
			code: 'variable-shadowed',
			name: 'API_URL',
			scope: { kind: 'global' },
			consumers,
		});

		expect(warning.success).toBe(true);
	});

	it('rejects a credential warning without any dropped field', () => {
		const warning = promotionBindingWarningSchema.safeParse({
			kind: 'credential',
			code: 'credential-values-dropped',
			sourceId: 'cred-1',
			name: 'GitHub',
			droppedFields: [],
			consumers,
		});

		expect(warning.success).toBe(false);
	});
});
