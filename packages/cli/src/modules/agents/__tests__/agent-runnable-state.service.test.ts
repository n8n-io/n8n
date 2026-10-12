import type { AgentSkill } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentPublishService } from '../agent-publish.service';
import { AgentRunnableStateService } from '../agent-runnable-state.service';
import type { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { Agent } from '../entities/agent.entity';

const pinId = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';

function body(instructions: string): AgentSkill {
	return { name: 'Skill', description: 'A skill', instructions };
}

describe('AgentRunnableStateService', () => {
	it('lists the pinned skills that have a newer version', async () => {
		const skillRefs = mock<AgentSkillRefsService>();
		skillRefs.readDraft.mockResolvedValue({
			skillRefs: [
				{ type: 'skill', id: 'pinned_older', versionId: pinId },
				{ type: 'skill', id: 'pinned_latest', versionId: pinId },
				{ type: 'skill', id: 'unpinned' },
			],
			skills: {
				pinned_older: body('Old text.'),
				pinned_latest: body('Latest text.'),
				unpinned: body('Latest text.'),
			},
		});
		skillRefs.skillsForRefs.mockResolvedValue({
			pinned_older: body('New text.'),
			pinned_latest: body('Latest text.'),
		});
		const publishService = mock<AgentPublishService>();
		publishService.hasPublishHistory.mockResolvedValue(false);
		const service = new AgentRunnableStateService(
			mock<CredentialsService>(),
			mock<AgentValidationService>(),
			publishService,
			skillRefs,
		);
		const agent = { id: 'agent-1', schema: null, integrations: [] } as unknown as Agent;

		const result = await service.addRunnableState(agent, 'project-1', mock<User>(), {
			status: 'valid',
			issues: [],
		});

		expect(skillRefs.skillsForRefs).toHaveBeenCalledWith(
			[
				{ type: 'skill', id: 'pinned_older' },
				{ type: 'skill', id: 'pinned_latest' },
			],
			{},
		);
		expect(result.outdatedSkillIds).toEqual(['pinned_older']);
	});
});
