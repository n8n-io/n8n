import {
	promotionDependencyWarningSchema,
	promotionMissingDependencySchema,
} from '../promotion-apply-check.dto';

const consumers = [
	{ project: { id: 'project1', name: 'Orders' }, workflows: [{ id: 'workflow1', name: 'Sync' }] },
];

describe('promotionMissingDependencySchema', () => {
	const credential = {
		kind: 'credential',
		id: 'credential1',
		name: 'CRM key',
		credentialType: 'httpHeaderAuth',
		group: 'other-project',
		reason: 'not-on-branch',
		accessible: true,
		blocking: false,
		consumers,
	};

	it('accepts a credential entry', () => {
		expect(promotionMissingDependencySchema.parse(credential)).toEqual(credential);
	});

	it('accepts a variable entry, which has no id and no credential type', () => {
		const variable = {
			kind: 'variable',
			name: 'region',
			group: 'needs-action',
			reason: 'not-on-instance',
			accessible: true,
			blocking: true,
			consumers,
		};

		expect(promotionMissingDependencySchema.parse(variable)).toEqual(variable);
	});

	it.each([
		['kind', 'dataTable'],
		['group', 'shared'],
		['reason', 'deleted'],
	])('rejects an unknown %s', (field, value) => {
		expect(
			promotionMissingDependencySchema.safeParse({ ...credential, [field]: value }).success,
		).toBe(false);
	});

	it.each(['name', 'group', 'reason', 'accessible', 'blocking', 'consumers'])(
		'requires %s',
		(field) => {
			const { [field]: _omitted, ...entry } = credential as Record<string, unknown>;

			expect(promotionMissingDependencySchema.safeParse(entry).success).toBe(false);
		},
	);

	it('requires a workflow that uses the dependency', () => {
		expect(
			promotionMissingDependencySchema.safeParse({ ...credential, consumers: [] }).success,
		).toBe(false);
	});

	it('removes a field that names the owner project', () => {
		const withOwner = { ...credential, ownerProject: { id: 'project2', name: 'Billing' } };

		expect(promotionMissingDependencySchema.parse(withOwner)).toEqual(credential);
	});
});

describe('promotionDependencyWarningSchema', () => {
	const warning = {
		kind: 'workflow',
		code: 'missing-on-source',
		id: 'workflow2',
		name: 'Notify',
		blocking: false,
		consumers,
	};

	it('accepts a warning about a workflow', () => {
		expect(promotionDependencyWarningSchema.parse(warning)).toEqual(warning);
	});

	it('accepts a warning about a variable, which has no id', () => {
		const { id: _id, ...variable } = { ...warning, kind: 'variable', name: 'region' };

		expect(promotionDependencyWarningSchema.parse(variable)).toEqual(variable);
	});

	it.each([
		['kind', 'tag'],
		['code', 'variable-shadowed'],
	])('rejects an unknown %s', (field, value) => {
		expect(promotionDependencyWarningSchema.safeParse({ ...warning, [field]: value }).success).toBe(
			false,
		);
	});
});
