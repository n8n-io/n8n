import { PromotionPreviewDto, PromotionPromoteCheckDto } from '../promotion-preview.dto';

const missingDependency = {
	kind: 'workflow',
	id: 'workflow2',
	name: 'Notify',
	group: 'personal',
	reason: 'personal-project',
	accessible: false,
	blocking: true,
	consumers: [
		{ project: { id: 'project1', name: 'Orders' }, workflows: [{ id: 'workflow1', name: 'Sync' }] },
	],
};
const warning = {
	kind: 'variable',
	code: 'missing-on-source',
	name: 'region',
	blocking: false,
	consumers: missingDependency.consumers,
};

describe('PromotionPromoteCheckDto', () => {
	it('accepts the two lists and the revision', () => {
		const check = {
			missingDependencies: [missingDependency],
			warnings: [warning],
			revision: 'abc',
		};

		expect(PromotionPromoteCheckDto.parse(check)).toEqual(check);
	});

	it('accepts empty lists', () => {
		const check = { missingDependencies: [], warnings: [], revision: 'abc' };

		expect(PromotionPromoteCheckDto.parse(check)).toEqual(check);
	});

	it.each(['missingDependencies', 'warnings', 'revision'])('requires %s', (field) => {
		const { [field]: _omitted, ...check } = {
			missingDependencies: [],
			warnings: [],
			revision: 'abc',
		} as Record<string, unknown>;

		expect(PromotionPromoteCheckDto.safeParse(check).success).toBe(false);
	});

	it('rejects an entry with an unknown group', () => {
		const check = {
			missingDependencies: [{ ...missingDependency, group: 'shared' }],
			warnings: [],
			revision: 'abc',
		};

		expect(PromotionPromoteCheckDto.safeParse(check).success).toBe(false);
	});
});

describe('PromotionPreviewDto', () => {
	const preview = {
		commitSha: null,
		source: { environmentId: 'environment1', branchName: 'main' },
		environment: { name: 'Production', providerType: 'git' },
		resources: [],
		dependencies: [],
		revision: 'abc',
	};

	it('accepts a preview without the dependency lists', () => {
		expect(PromotionPreviewDto.parse(preview)).toEqual(preview);
	});

	it('accepts a Promote preview with the dependency lists', () => {
		const withLists = { ...preview, missingDependencies: [missingDependency], warnings: [warning] };

		expect(PromotionPreviewDto.parse(withLists)).toEqual(withLists);
	});

	it('rejects a warning with an unknown code', () => {
		const withLists = { ...preview, warnings: [{ ...warning, code: 'deleted' }] };

		expect(PromotionPreviewDto.safeParse(withLists).success).toBe(false);
	});
});
