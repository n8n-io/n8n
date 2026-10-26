import { CreateSkillDto, ListSkillsQueryDto, SaveSkillDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import type { InstanceAiSkillService } from '@n8n/instance-ai';
import { UserError } from 'n8n-workflow';

import { SkillNameTakenError, skillNameTakenToolMessage, SkillService } from '@/modules/skills';

const STALE_SKILL_TOOL_MESSAGE =
	'The skill changed since you read it, so nothing was saved. Read it again with the get action and retry with its new skillHash.';

@Service()
export class InstanceAiSkillsAdapterService {
	constructor(private readonly skillService: SkillService) {}

	createService(user: User, assistantSkillsEnabled: boolean): InstanceAiSkillService {
		return {
			assistantSkillsEnabled,
			list: async ({ query, scope, projectId, attachableToAgentId, limit, skip }) =>
				await this.skillService.list(
					user,
					ListSkillsQueryDto.parse({
						search: query,
						scope,
						projectId,
						attachableTo: attachableToAgentId,
						take: String(limit),
						skip: String(skip),
					}),
				),
			get: async (skillId) => await this.skillService.get(user, skillId),
			create: async (input) => {
				try {
					return await this.skillService.create(user, CreateSkillDto.parse(input), 'assistant');
				} catch (error) {
					if (error instanceof SkillNameTakenError) {
						throw new UserError(skillNameTakenToolMessage(error.skillName));
					}
					throw error;
				}
			},
			update: async (skillId, input) => {
				try {
					return await this.skillService.update(
						user,
						skillId,
						SaveSkillDto.parse(input),
						'assistant',
					);
				} catch (error) {
					if (error instanceof SkillNameTakenError) {
						throw new UserError(skillNameTakenToolMessage(error.skillName));
					}
					if (!(error instanceof ConflictError)) throw error;
					const { skillHash } = await this.skillService.get(user, skillId);
					if (skillHash === input.baseSkillHash) throw error;
					throw new UserError(STALE_SKILL_TOOL_MESSAGE);
				}
			},
			delete: async (skillId) => await this.skillService.delete(user, skillId, 'assistant'),
		};
	}
}
