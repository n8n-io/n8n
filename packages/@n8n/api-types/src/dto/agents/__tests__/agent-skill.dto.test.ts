import { CreateAgentSkillDto } from '../create-agent-skill.dto';
import { UpdateAgentSkillDto } from '../update-agent-skill.dto';

describe('agent skill DTOs', () => {
	const validSkill = {
		id: 'summarize_notes',
		name: 'Summarize Notes',
		description: 'Use when summarizing notes',
		instructions: 'Extract decisions and action items.',
	};

	it('rejects create payloads with descriptions that are not routing hints', () => {
		const result = CreateAgentSkillDto.safeParse({
			...validSkill,
			description: 'Summarize notes',
		});

		expect(result.success).toBe(false);
	});

	it('rejects update payloads with descriptions that are not routing hints', () => {
		const result = UpdateAgentSkillDto.safeParse({
			description: 'Summarize notes',
		});

		expect(result.success).toBe(false);
	});

	it('accepts descriptions that start with Use when', () => {
		expect(CreateAgentSkillDto.safeParse(validSkill).success).toBe(true);
		expect(
			UpdateAgentSkillDto.safeParse({
				description: 'Use when extracting decisions from notes',
			}).success,
		).toBe(true);
	});
});
