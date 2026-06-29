import {
	AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	agentSkillSchema,
	CreateAgentSkillDto,
	UpdateAgentSkillDto,
} from '../dto';

describe('agent skill DTOs', () => {
	const validSkill = {
		name: 'Summarize Notes',
		description: 'Summarizes meeting notes',
		instructions: 'Extract decisions and action items.',
	};

	it('accepts natural-language descriptions', () => {
		expect(CreateAgentSkillDto.safeParse(validSkill).success).toBe(true);
		expect(
			UpdateAgentSkillDto.safeParse({
				description: 'Extracts decisions from notes',
			}).success,
		).toBe(true);
	});

	it('accepts allowed tools and markdown references without derived file metadata', () => {
		const result = agentSkillSchema.safeParse({
			...validSkill,
			allowedTools: ['load_workflow'],
			references: [
				{
					path: 'references/guide.md',
					content: '# Guide',
				},
			],
		});

		expect(result.success).toBe(true);
	});

	it('rejects removed metadata fields', () => {
		expect(agentSkillSchema.safeParse({ ...validSkill, recommendedTools: [] }).success).toBe(false);
		expect(UpdateAgentSkillDto.safeParse({ metadata: {} }).success).toBe(false);
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
						bytes: 7,
					},
				],
			}).success,
		).toBe(false);
	});

	it('rejects invalid or duplicate reference paths', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: '# Guide',
					},
					{
						path: 'references/guide.md',
						content: '# Guide 2',
					},
				],
			}).success,
		).toBe(false);
	});

	it('rejects oversized or too many references', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: 'x'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_BYTES + 1),
					},
				],
			}).success,
		).toBe(false);

		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: Array.from({ length: AGENT_SKILL_REFERENCE_MAX_COUNT + 1 }, (_, index) => ({
					path: `references/${index}.md`,
					content: '# Guide',
				})),
			}).success,
		).toBe(false);
	});

	it('allows empty arrays on update so list fields can be cleared', () => {
		expect(
			UpdateAgentSkillDto.safeParse({
				allowedTools: [],
			}).success,
		).toBe(true);
	});
});
