import {
	CreateSkillDto,
	ListSkillsQueryDto,
	SaveSkillDto,
	SkillNewNameQueryDto,
	SKILLS_MAX_PAGE_SIZE,
} from '../skills.schema';

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

	it('parses the project an agent attaches skills for', () => {
		expect(ListSkillsQueryDto.parse({ attachableTo: 'p1' })).toMatchObject({ attachableTo: 'p1' });
	});

	it.each(['team', 'user'])('rejects the unknown scope %s', (scope) => {
		expect(ListSkillsQueryDto.safeParse({ scope }).success).toBe(false);
	});
});

describe('CreateSkillDto', () => {
	const skill = { name: 'Brand voice', description: 'How we write', instructions: 'Be brief.' };

	it.each([
		[{ scope: 'project', projectId: 'p1' }],
		[{ scope: 'agent', agentId: 'a1' }],
		[{ scope: 'instance' }],
	])('accepts %o', (target) => {
		expect(CreateSkillDto.safeParse({ ...target, skill }).success).toBe(true);
	});

	it('rejects allowed tools, which hub skills ignore', () => {
		expect(
			CreateSkillDto.safeParse({
				scope: 'instance',
				skill: { ...skill, allowedTools: ['search'] },
			}).success,
		).toBe(false);
	});

	it('rejects a skill without instructions', () => {
		expect(
			CreateSkillDto.safeParse({ scope: 'instance', skill: { ...skill, instructions: '' } })
				.success,
		).toBe(false);
	});
});

describe('SaveSkillDto', () => {
	it('does not default availability on an unrelated save', () => {
		expect(SaveSkillDto.parse({ baseSkillHash: 'h1' })).not.toHaveProperty('availableToAssistant');
	});

	it('accepts changed fields with the base hash', () => {
		expect(SaveSkillDto.safeParse({ instructions: 'Be brief.', baseSkillHash: 'h1' }).success).toBe(
			true,
		);
	});

	it.each([[{ instructions: 'Be brief.' }], [{ instructions: 'Be brief.', baseSkillHash: '' }]])(
		'rejects a save without a base hash: %o',
		(payload) => {
			expect(SaveSkillDto.safeParse(payload).success).toBe(false);
		},
	);
});

describe('SkillNewNameQueryDto', () => {
	it('trims the requested name', () => {
		expect(SkillNewNameQueryDto.parse({ scope: 'instance', name: '  New skill ' }).name).toBe(
			'New skill',
		);
	});

	it('refuses a name of only spaces', () => {
		expect(SkillNewNameQueryDto.safeParse({ scope: 'instance', name: '   ' }).success).toBe(false);
	});
});
