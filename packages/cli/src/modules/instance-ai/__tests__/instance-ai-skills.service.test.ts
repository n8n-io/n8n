import { createRuntimeSkillSource } from '@n8n/agents';
import type { Mock } from 'vitest';

vi.mock('@n8n/instance-ai', () => ({
	disabledInstanceAiSkillIds: vi.fn(() => []),
	loadInstanceAiPromptSkills: vi.fn(),
	loadInstanceAiRuntimeSkillSource: vi.fn(),
	serveRuntimeSkillsFromWorkspace: vi.fn(() => 'served-source'),
}));

import {
	disabledInstanceAiSkillIds,
	loadInstanceAiPromptSkills,
	loadInstanceAiRuntimeSkillSource,
	serveRuntimeSkillsFromWorkspace,
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
			expect(skills.catalog).toBe(profileSource);
			expect(skills.disabledTools).toEqual(['submit-workflow']);
		});

		it('removes the skills that the flags turn off', async () => {
			(disabledInstanceAiSkillIds as Mock).mockReturnValue(['evals']);

			const { catalog } = await service.resolveForRun(profile, flags);

			expect(catalog.registry.skills.map((entry) => entry.id)).toEqual(['workflow-builder']);
			expect(catalog.registry.skillsHash).not.toBe(profileSource.registry.skillsHash);
			await expect(catalog.loadSkill('evals')).resolves.toBeNull();
		});
	});

	describe('serveFromSandbox', () => {
		it('serves the catalog from the skills that the sandbox stores', () => {
			const stored = createRuntimeSkillSource([skill('workflow-builder'), skill('evals')]);
			(loadInstanceAiRuntimeSkillSource as Mock).mockReturnValue(stored);

			const served = service.serveFromSandbox(profileSource, '/home/user/workspace');

			expect(served).toBe('served-source');
			expect(serveRuntimeSkillsFromWorkspace).toHaveBeenCalledWith({
				source: profileSource,
				storedSource: stored,
				root: '/home/user/workspace',
			});
		});
	});
});
