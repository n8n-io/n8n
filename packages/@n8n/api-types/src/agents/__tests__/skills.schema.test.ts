import { CreateSkillDto, ListSkillsQueryDto, SKILLS_MAX_PAGE_SIZE } from '../skills.schema';

describe('ListSkillsQueryDto', () => {
	it('leaves take unset when the client sends none, so the whole list comes back', () => {
		expect(ListSkillsQueryDto.parse({})).toEqual({ skip: 0, take: undefined });
	});

	it('caps take at the page limit', () => {
		expect(ListSkillsQueryDto.parse({ take: '500' }).take).toBe(SKILLS_MAX_PAGE_SIZE);
	});

	it('parses skip, take and the filters', () => {
		expect(
			ListSkillsQueryDto.parse({
				skip: '10',
				take: '5',
				search: ' voice ',
				scope: 'project',
				projectId: 'p1',
			}),
		).toEqual({ skip: 10, take: 5, search: 'voice', scope: 'project', projectId: 'p1' });
	});

	it.each([['0'], ['-1'], ['abc']])('rejects take "%s"', (take) => {
		expect(ListSkillsQueryDto.safeParse({ take }).success).toBe(false);
	});

	it('rejects an unknown scope', () => {
		expect(ListSkillsQueryDto.safeParse({ scope: 'team' }).success).toBe(false);
	});
});

describe('CreateSkillDto', () => {
	const skill = { name: 'Brand voice', description: 'How we write', instructions: 'Be brief.' };

	it.each([[{ scope: 'user' }], [{ scope: 'project', projectId: 'p1' }], [{ scope: 'instance' }]])(
		'accepts %o',
		(target) => {
			expect(CreateSkillDto.safeParse({ ...target, skill }).success).toBe(true);
		},
	);

	it('rejects a skill without instructions', () => {
		expect(
			CreateSkillDto.safeParse({ scope: 'user', skill: { ...skill, instructions: '' } }).success,
		).toBe(false);
	});
});
