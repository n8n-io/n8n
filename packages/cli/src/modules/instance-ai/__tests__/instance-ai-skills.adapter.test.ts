import type { SkillDetail } from '@n8n/api-types';
import { User } from '@n8n/db';
import { ConflictError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { InstanceAiSkillsAdapterService } from '../instance-ai-skills.adapter';
import { SkillNameTakenError, type SkillService } from '@/modules/skills';
import { SkillSyncedError } from '@/modules/skills/testing';

describe('InstanceAiSkillsAdapterService', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const skillService = mock<SkillService>();
	const service = new InstanceAiSkillsAdapterService(skillService).createService(user, true);
	const skill = { name: 'Brand voice', description: 'd', instructions: 'Be kind.' };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists the skills with the filters the tool sent', async () => {
		skillService.list.mockResolvedValue({ count: 0, data: [] });

		await service.list({ query: 'brand', attachableToAgentId: 'agent-1', limit: 20, skip: 40 });

		expect(skillService.list).toHaveBeenCalledWith(user, {
			search: 'brand',
			attachableTo: 'agent-1',
			skip: 40,
			take: 20,
		});
	});

	it('creates the skill with the assistant source', async () => {
		skillService.create.mockResolvedValue(mock<SkillDetail>());

		await service.create({ scope: 'project', projectId: 'project-1', skill });

		expect(skillService.create).toHaveBeenCalledWith(
			user,
			{ scope: 'project', projectId: 'project-1', skill },
			'assistant',
		);
	});

	it('exposes whether the n8n Assistant can use skills', () => {
		expect(service.assistantSkillsEnabled).toBe(true);
	});

	it('creates the skill with the Assistant availability the tool sent', async () => {
		skillService.create.mockResolvedValue(mock<SkillDetail>());

		await service.create({ scope: 'instance', skill, availableToAssistant: true });

		expect(skillService.create).toHaveBeenCalledWith(
			user,
			{ scope: 'instance', skill, availableToAssistant: true },
			'assistant',
		);
	});

	it('refuses a skill with fields that skills do not have', async () => {
		await expect(
			service.create({
				scope: 'instance',
				skill: { ...skill, allowedTools: ['search'] } as typeof skill,
			}),
		).rejects.toThrow();
		expect(skillService.create).not.toHaveBeenCalled();
	});

	it('tells the model to choose another name when the name is taken', async () => {
		skillService.create.mockRejectedValue(new SkillNameTakenError('Brand voice'));

		await expect(service.create({ scope: 'instance', skill })).rejects.toThrow(
			'The skill name "Brand voice" is taken',
		);
	});

	it('saves the next version with the assistant source', async () => {
		await service.update('skill_a', { baseSkillHash: 'hash-2', instructions: 'Be kinder.' });

		expect(skillService.update).toHaveBeenCalledWith(
			user,
			'skill_a',
			{ baseSkillHash: 'hash-2', instructions: 'Be kinder.' },
			'assistant',
		);
	});

	it('tells the model to read the skill again when it changed since', async () => {
		skillService.update.mockRejectedValue(new ConflictError('changed'));
		skillService.get.mockResolvedValue(mock<SkillDetail>({ skillHash: 'hash-9' }));

		await expect(
			service.update('skill_a', { baseSkillHash: 'hash-2', instructions: 'Be kinder.' }),
		).rejects.toThrow('The skill changed since you read it');
	});

	it('tells the model that a synced skill is read-only', async () => {
		skillService.update.mockRejectedValue(new SkillSyncedError('Brand voice', 'GitHub'));

		await expect(
			service.update('skill_a', { baseSkillHash: 'hash-2', instructions: 'Be kinder.' }),
		).rejects.toThrow(
			'The skill "Brand voice" is synced from GitHub, so it is read-only and nothing was saved. Do not retry. Tell the user to change it in GitHub.',
		);
		expect(skillService.get).not.toHaveBeenCalled();
	});

	it('passes another conflict on as it is', async () => {
		skillService.update.mockRejectedValue(new ConflictError('Agents use this skill.'));
		skillService.get.mockResolvedValue(mock<SkillDetail>({ skillHash: 'hash-2' }));

		await expect(
			service.update('skill_a', { baseSkillHash: 'hash-2', scope: 'instance' }),
		).rejects.toThrow('Agents use this skill.');
	});

	it('deletes the skill with the assistant source', async () => {
		await service.delete('skill_a');

		expect(skillService.delete).toHaveBeenCalledWith(user, 'skill_a', 'assistant');
	});
});
