import {
	AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
	AGENT_SKILL_REFERENCE_MAX_COUNT,
	agentSkillReferencePathSchema,
	agentSkillSchema,
} from '../agent-skill.schema';
import { CreateAgentSkillDto, UpdateAgentSkillDto } from '../dto';
import { CreateSkillDto } from '../skills.schema';

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

	it('rejects a reference path with a control character', () => {
		for (const path of ['references/a\0.md', 'references/a\nb.md', 'references/\u001b[31ma.md']) {
			expect(agentSkillReferencePathSchema.safeParse(path).success).toBe(false);
		}
		expect(agentSkillReferencePathSchema.safeParse('references/a b.md').success).toBe(true);
	});

	// The Agent Skills format allows descriptions of up to 1024 characters, so skills from
	// GitHub fit without cuts.
	it.each([
		{ length: 1024, accepted: true },
		{ length: 1025, accepted: false },
	])('a description of $length characters → accepted $accepted', ({ length, accepted }) => {
		expect(
			agentSkillSchema.safeParse({ ...validSkill, description: 'x'.repeat(length) }).success,
		).toBe(accepted);
	});

	it('measures the instructions limit in characters, not UTF-8 bytes', () => {
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: 'x'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
			}).success,
		).toBe(true);

		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: 'x'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH + 1),
			}).success,
		).toBe(false);

		// '€' is 3 UTF-8 bytes but one character, so content that used to blow
		// the byte cap now fits — the editor's counter and the limit agree.
		expect(
			agentSkillSchema.safeParse({
				...validSkill,
				instructions: '€'.repeat(AGENT_SKILL_INSTRUCTIONS_MAX_LENGTH),
			}).success,
		).toBe(true);
	});

	it('rejects oversized or too many references', () => {
		expect(
			CreateAgentSkillDto.safeParse({
				...validSkill,
				references: [
					{
						path: 'references/guide.md',
						content: 'x'.repeat(AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH + 1),
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

	it.each(['', '   ', '\n\t'])('rejects instructions %j without text', (instructions) => {
		expect(agentSkillSchema.safeParse({ ...validSkill, instructions }).success).toBe(false);
		expect(CreateAgentSkillDto.safeParse({ ...validSkill, instructions }).success).toBe(false);
		expect(UpdateAgentSkillDto.safeParse({ instructions }).success).toBe(false);
		expect(
			CreateSkillDto.safeParse({ scope: 'instance', skill: { ...validSkill, instructions } })
				.success,
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
