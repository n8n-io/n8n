import { CreateAgentSkillDto } from '../create-agent-skill.dto';
import { UpdateAgentSkillDto } from '../update-agent-skill.dto';

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
});
