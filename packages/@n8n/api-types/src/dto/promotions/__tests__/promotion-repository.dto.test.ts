import {
	ListPromotionBranchesQueryDto,
	ListPromotionRepositoriesQueryDto,
	PromotionBranchListPublicDto,
	PromotionRepositoryListPublicDto,
	promotionRepositoryIdParamSchema,
} from '../promotion-repository.dto';

describe.each([ListPromotionRepositoriesQueryDto, ListPromotionBranchesQueryDto])('%s', (Dto) => {
	it('defaults and caps page size at 50 and trims search', () => {
		expect(Dto.parse({})).toEqual({ limit: 50 });
		expect(Dto.parse({ limit: '250', search: ' platform ' })).toEqual({
			limit: 50,
			search: 'platform',
		});
		expect(Dto.parse({ limit: '100' })).toEqual({ limit: 50 });
		expect(Dto.parse({ limit: '2', cursor: 'cursor' })).toEqual({
			limit: 2,
			cursor: 'cursor',
		});
	});

	it.each([
		{ limit: '-1' },
		{ limit: 'invalid' },
		{ offset: '1' },
		{ search: 'a'.repeat(256) },
		{ cursor: 'a'.repeat(2049) },
	])('rejects invalid query input: %j', (input) => {
		expect(Dto.safeParse(input).success).toBe(false);
	});
});

describe('discovery responses', () => {
	it('returns repository identity and target fields without extra fields', () => {
		const repository = {
			id: '42',
			name: 'Workflows',
			fullPath: 'platform/workflows',
			remoteUrl: 'https://gitlab.example.com/platform/workflows.git',
			defaultBranch: null,
		};
		expect(
			PromotionRepositoryListPublicDto.parse({
				data: [{ ...repository, accessToken: 'not-public' }],
				nextCursor: null,
			}),
		).toEqual({ data: [repository], nextCursor: null });
	});

	it('returns branch names and default flags without commit details', () => {
		expect(
			PromotionBranchListPublicDto.parse({
				data: [{ name: 'main', isDefault: true, commit: { id: 'not-public' } }],
				nextCursor: null,
			}),
		).toEqual({ data: [{ name: 'main', isDefault: true }], nextCursor: null });
	});

	it.each(['.', '..', '', 'a'.repeat(257)])('rejects invalid repository IDs: %s', (id) => {
		expect(promotionRepositoryIdParamSchema.safeParse(id).success).toBe(false);
	});
});
