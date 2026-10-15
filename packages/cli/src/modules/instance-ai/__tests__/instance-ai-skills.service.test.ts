import { createRuntimeSkillSource } from '@n8n/agents';
import type { Mock } from 'vitest';

vi.mock('@n8n/instance-ai', () => ({
	bindRuntimeSkillsToWorkspace: vi.fn(() => 'bound-source'),
	disabledInstanceAiSkillIds: vi.fn(() => []),
	loadInstanceAiPromptSkills: vi.fn(),
}));

import {
	bindRuntimeSkillsToWorkspace,
	disabledInstanceAiSkillIds,
	loadInstanceAiPromptSkills,
	type PromptProfile,
} from '@n8n/instance-ai';

import { InstanceAiSkillsService } from '../instance-ai-skills.service';

const profile = { version: 'test@1' } as unknown as PromptProfile;
const flags = {
	configEvalsEnabled: false,
	instanceContextEnabled: false,
	agentBuildingEnabled: false,
};

function skill(id: string) {
	return { id, name: id, description: `Use ${id}.`, instructions: `Do ${id}.` };
}

describe('InstanceAiSkillsService', () => {
	const service = new InstanceAiSkillsService();
	const profileSource = createRuntimeSkillSource([skill('workflow-builder'), skill('evals')]);

	beforeEach(() => {
		vi.clearAllMocks();
		(loadInstanceAiPromptSkills as Mock).mockResolvedValue({
			source: profileSource,
			disabledTools: ['submit-workflow'],
		});
	});

	describe('resolveForRun', () => {
		it('returns the profile skills and disabled tools when no flag turns a skill off', async () => {
			const skills = await service.resolveForRun(profile, flags);

			expect(loadInstanceAiPromptSkills).toHaveBeenCalledWith(profile);
			expect(disabledInstanceAiSkillIds).toHaveBeenCalledWith(flags);
			expect(skills.source).toBe(profileSource);
			expect(skills.disabledTools).toEqual(['submit-workflow']);
		});

		it('removes the skills that the flags turn off', async () => {
			(disabledInstanceAiSkillIds as Mock).mockReturnValue(['evals']);

			const { source } = await service.resolveForRun(profile, flags);

			expect(source.registry.skills.map((entry) => entry.id)).toEqual(['workflow-builder']);
			expect(source.registry.skillsHash).not.toBe(profileSource.registry.skillsHash);
			await expect(source.loadSkill('evals')).resolves.toBeNull();
		});
	});

	describe('bindToWorkspace', () => {
		it('binds the skills to the workspace root', () => {
			const bound = service.bindToWorkspace(profileSource, '/home/user/workspace');

			expect(bound).toBe('bound-source');
			expect(bindRuntimeSkillsToWorkspace).toHaveBeenCalledWith(
				profileSource,
				'/home/user/workspace',
			);
		});
	});
});
