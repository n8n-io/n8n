import {
	promotionApplyCheckSchema,
	promotionBindingConflictSchema,
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

	it('accepts an entry that names the project of the dependency', () => {
		const withProject = { ...credential, project: { id: 'project2', name: 'Billing' } };

		expect(promotionMissingDependencySchema.parse(withProject)).toEqual(withProject);
	});

	it.each([
		['an id', { name: 'Billing' }],
		['a name', { id: 'project2' }],
	])('rejects a project without %s', (_case, project) => {
		expect(promotionMissingDependencySchema.safeParse({ ...credential, project }).success).toBe(
			false,
		);
	});

	it('removes other fields of the project', () => {
		const project = { id: 'project2', name: 'Billing' };
		const withType = { ...credential, project: { ...project, type: 'team' } };

		expect(promotionMissingDependencySchema.parse(withType)).toEqual({ ...credential, project });
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

describe('promotionApplyCheckSchema', () => {
	const check = {
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [],
		warnings: [],
		missingDependencies: [],
	};
	const outsideAccess = {
		kind: 'credential',
		id: 'credential1',
		name: 'CRM key',
		credentialType: 'httpHeaderAuth',
		group: 'outside-access',
		reason: 'not-on-instance',
		accessible: false,
		blocking: true,
		consumers,
	};

	it('accepts a check whose only entry is a missing dependency', () => {
		const withDependency = { ...check, missingDependencies: [outsideAccess] };

		expect(promotionApplyCheckSchema.parse(withDependency)).toEqual(withDependency);
	});

	it('requires the list of missing dependencies', () => {
		const { missingDependencies: _omitted, ...withoutList } = check;

		expect(promotionApplyCheckSchema.safeParse(withoutList).success).toBe(false);
	});

	it.each(['archived', 'caller-policy', 'not-shared', 'type-mismatch'])(
		'accepts the Apply reason %s',
		(reason) => {
			const entry = { ...outsideAccess, group: 'needs-action', accessible: true, reason };

			expect(promotionApplyCheckSchema.parse({ ...check, missingDependencies: [entry] })).toEqual({
				...check,
				missingDependencies: [entry],
			});
		},
	);

	it('rejects an entry of the list that is not a missing dependency', () => {
		const { group: _omitted, ...withoutGroup } = outsideAccess;

		expect(
			promotionApplyCheckSchema.safeParse({ ...check, missingDependencies: [withoutGroup] })
				.success,
		).toBe(false);
	});
});

describe('promotionBindingConflictSchema', () => {
	const credentialConflict = {
		kind: 'credential',
		sourceId: 'credential1',
		name: 'CRM key',
		expectedTypes: ['httpHeaderAuth'],
		referenceFiles: ['workflow.json'],
		consumers,
	};

	it('accepts a credential conflict that the check still reports', () => {
		const conflict = { ...credentialConflict, code: 'unknown-type' };

		expect(promotionBindingConflictSchema.parse(conflict)).toEqual(conflict);
	});

	it('rejects the code of a credential without an owner, which is a missing dependency now', () => {
		expect(
			promotionBindingConflictSchema.safeParse({ ...credentialConflict, code: 'unknown-owner' })
				.success,
		).toBe(false);
	});
});
