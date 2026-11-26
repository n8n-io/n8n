import {
	connectPublicSkillSourceSchema,
	CreateSkillDto,
	discoverPublicSkillSourceSchema,
	ListSkillsQueryDto,
	SaveSkillDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiSkillService } from '@n8n/instance-ai';
import { UserError } from '@n8n/errors';

import {
	SkillService,
	SkillSourceService,
	skillSourceReasonOf,
	toSkillToolRefusal,
} from '@/modules/skills';

const STALE_SKILL_TOOL_MESSAGE =
	'The skill changed since you read it, so nothing was saved. Read it again with the get action and retry with its new skillHash.';

/**
 * A source request that failed for a known reason, such as a source that changed since the
 * preview, is a refusal that the model can act on. So the model gets the message of the
 * service, as it does for a refused create or update, and not an internal error.
 */
async function withSourceRefusal<T>(action: () => Promise<T>): Promise<T> {
	try {
		return await action();
	} catch (error) {
		if (skillSourceReasonOf(error) === undefined || !(error instanceof Error)) throw error;
		throw new UserError(error.message, { cause: error });
	}
}

@Service()
export class InstanceAiSkillsAdapterService {
	constructor(
		private readonly skillService: SkillService,
		private readonly skillSourceService: SkillSourceService,
	) {}

	createService(
		user: User,
		assistantSkillsEnabled: boolean,
		skillSourcesEnabled = false,
		workflowsInSkillsEnabled = false,
	): InstanceAiSkillService {
		return {
			assistantSkillsEnabled,
			workflowsInSkillsEnabled,
			...(skillSourcesEnabled
				? {
						sources: {
							list: async () => await this.skillSourceService.list(user),
							discover: async (input) =>
								await withSourceRefusal(
									async () =>
										await this.skillSourceService.discoverPublic(
											user,
											discoverPublicSkillSourceSchema.parse(input),
											'assistant',
										),
								),
							checkImport: async (input) =>
								await withSourceRefusal(
									async () =>
										await this.skillSourceService.checkPublicImport(
											user,
											connectPublicSkillSourceSchema.parse(input),
											'assistant',
										),
								),
							connect: async (input) =>
								await withSourceRefusal(
									async () =>
										await this.skillSourceService.connectPublic(
											user,
											connectPublicSkillSourceSchema.parse(input),
											'assistant',
										),
								),
						},
					}
				: {}),
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
					const refusal = await toSkillToolRefusal(error);
					if (refusal?.code === 'skill_name_taken') throw new UserError(refusal.message);
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
						// The Assistant reads a binary file without its content, so it cannot send it back.
						{ keepUnnamedBinaryFiles: true },
					);
				} catch (error) {
					const refusal = await toSkillToolRefusal(error, {
						baseSkillHash: input.baseSkillHash,
						currentHash: async () => (await this.skillService.get(user, skillId)).skillHash,
					});
					if (!refusal) throw error;
					throw new UserError(
						refusal.code === 'stale_skill' ? STALE_SKILL_TOOL_MESSAGE : refusal.message,
					);
				}
			},
			delete: async (skillId) => await this.skillService.delete(user, skillId, 'assistant'),
		};
	}
}
