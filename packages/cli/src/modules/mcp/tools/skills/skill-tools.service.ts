import {
	CreateSkillDto,
	ListSkillsQueryDto,
	SaveSkillDto,
	SKILLS_MAX_PAGE_SIZE,
	skillScopeSchema,
	type SkillDetail,
	type SkillListItem,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { z } from 'zod';

import {
	SkillNameTakenError,
	skillNameTakenToolMessage,
} from '@/modules/skills/skill-name-taken.error';
import { SkillsApiService } from '@/modules/skills/skills-api.service';
import { AssistantSkillsRollout } from '@/modules/skills/assistant-skills-rollout';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { RegisterToolFn, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { trackAndReturnToolError } from '../tool-error.utils';
import { toolResult } from '../tool-result.utils';

const searchSkillsInput = {
	query: z.string().trim().max(200).optional().describe('Filter by skill name or description'),
	scope: skillScopeSchema.optional().describe('Only skills of this scope'),
	projectId: z.string().min(1).optional().describe('Only skills of this project'),
	attachableToAgentId: z
		.string()
		.min(1)
		.optional()
		.describe('Only the skills this Agent may attach. Do not combine with scope or projectId'),
	limit: z.number().int().min(1).max(SKILLS_MAX_PAGE_SIZE).optional().default(50),
	skip: z.number().int().min(0).optional().default(0).describe('Skills to skip, for the next page'),
} satisfies z.ZodRawShape;

const skillIdInput = {
	skillId: z.string().min(1).describe('The skill ID from search_n8n_skills'),
} satisfies z.ZodRawShape;

const createSkillInput = {
	scope: skillScopeSchema.describe(
		'project: one project can use the skill. instance: every project can use it',
	),
	projectId: z.string().min(1).optional().describe('Required when scope is project'),
	skill: CreateSkillDto.schema.shape.skill,
	availableToAssistant: CreateSkillDto.schema.shape.availableToAssistant.describe(
		'Allow the n8n Assistant to use this skill. Defaults to false.',
	),
} satisfies z.ZodRawShape;

const updateSkillInput = {
	...skillIdInput,
	...SaveSkillDto.schema.shape,
	availableToAssistant: SaveSkillDto.schema.shape.availableToAssistant.describe(
		'Allow the n8n Assistant to use this instance or project skill. Changing only this setting keeps the content version.',
	),
	baseSkillHash: SaveSkillDto.schema.shape.baseSkillHash.describe(
		'skillHash from get_skill. The update is refused if the skill changed since',
	),
	scope: SaveSkillDto.schema.shape.scope.describe(
		'Moves the skill. Refused if an Agent that uses the skill cannot use it in the new scope',
	),
} satisfies z.ZodRawShape;

type SearchSkillsInput = z.infer<z.ZodObject<typeof searchSkillsInput>>;
type CreateSkillInput = z.infer<z.ZodObject<typeof createSkillInput>>;
type UpdateSkillInput = z.infer<z.ZodObject<typeof updateSkillInput>>;

function summary(item: SkillListItem, assistantSkillsEnabled: boolean) {
	return {
		id: item.id,
		name: item.name,
		description: item.description,
		scope: item.scope,
		projectId: item.projectId,
		projectName: item.projectName,
		...(assistantSkillsEnabled ? { availableToAssistant: item.availableToAssistant } : {}),
		latestVersion: item.latestVersion,
		usedByAgents: item.usedByAgents,
		canEdit: item.canEdit,
		canDelete: item.canDelete,
		updatedAt: item.updatedAt,
	};
}

function details(detail: SkillDetail, assistantSkillsEnabled: boolean) {
	return {
		...summary(detail, assistantSkillsEnabled),
		skill: detail.skill,
		skillHash: detail.skillHash,
		usedBy: detail.usedBy,
	};
}

@Service()
export class McpSkillToolsService {
	constructor(
		private readonly telemetry: Telemetry,
		private readonly skillsApi: SkillsApiService,
		private readonly assistantSkillsRollout: AssistantSkillsRollout,
	) {}

	async registerTools(registerTool: RegisterToolFn, user: User): Promise<void> {
		const assistantSkillsEnabled = await this.assistantSkillsRollout.isEnabled();
		const { availableToAssistant: _createAvailability, ...createWithoutAssistant } =
			createSkillInput;
		const { availableToAssistant: _updateAvailability, ...updateWithoutAssistant } =
			updateSkillInput;
		registerTool({
			name: 'search_n8n_skills',
			config: {
				description: 'Search the skills hub. Skills are reusable instructions.',
				inputSchema: searchSkillsInput,
				annotations: {
					title: 'Search n8n Skills',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async (input: SearchSkillsInput) =>
				await this.run(user, 'search_n8n_skills', { scope: input.scope }, async () => {
					const { count, data } = await this.skillsApi.list(
						user,
						ListSkillsQueryDto.parse({
							search: input.query,
							scope: input.scope,
							projectId: input.projectId,
							attachableTo: input.attachableToAgentId,
							skip: String(input.skip),
							take: String(input.limit),
						}),
					);
					return { count, skills: data.map((item) => summary(item, assistantSkillsEnabled)) };
				}),
		});

		registerTool({
			name: 'get_skill',
			config: {
				description:
					'Read a skill with its instructions, references, skillHash and the Agents that use it.',
				inputSchema: skillIdInput,
				annotations: {
					title: 'Get Skill',
					readOnlyHint: true,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async ({ skillId }) =>
				await this.run(user, 'get_skill', { skillId }, async () =>
					details(await this.skillsApi.get(user, skillId), assistantSkillsEnabled),
				),
		});

		registerTool({
			name: 'create_skill',
			config: {
				description: 'Create a skill in the skills hub.',
				inputSchema: assistantSkillsEnabled ? createSkillInput : createWithoutAssistant,
				annotations: {
					title: 'Create Skill',
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: false,
				},
			},
			handler: async (input: CreateSkillInput) =>
				await this.run(user, 'create_skill', { scope: input.scope }, async () => {
					try {
						const detail = await this.skillsApi.create(
							user,
							CreateSkillDto.parse({
								scope: input.scope,
								projectId: input.projectId,
								skill: input.skill,
								availableToAssistant: input.availableToAssistant,
							}),
							'mcp',
						);
						return details(detail, assistantSkillsEnabled);
					} catch (error) {
						if (!(error instanceof SkillNameTakenError)) throw error;
						return {
							ok: false,
							code: 'skill_name_taken',
							message: skillNameTakenToolMessage(error.skillName),
						};
					}
				}),
		});

		registerTool({
			name: 'update_skill',
			config: {
				description:
					'Update a skill. Content changes create a new version. Pass only the fields to change.',
				inputSchema: assistantSkillsEnabled ? updateSkillInput : updateWithoutAssistant,
				annotations: {
					title: 'Update Skill',
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async ({ skillId, ...update }: UpdateSkillInput) =>
				await this.run(user, 'update_skill', { skillId, scope: update.scope }, async () => {
					try {
						const { skill: _skill, ...saved } = await this.skillsApi.update(
							user,
							skillId,
							SaveSkillDto.parse(update),
							'mcp',
						);
						return saved;
					} catch (error) {
						if (error instanceof SkillNameTakenError) {
							return {
								ok: false,
								code: 'skill_name_taken',
								skillId,
								message: skillNameTakenToolMessage(error.skillName),
							};
						}
						if (!(error instanceof ConflictError)) throw error;
						const { skillHash } = await this.skillsApi.get(user, skillId);
						if (skillHash === update.baseSkillHash) throw error;
						return {
							ok: false,
							code: 'stale_skill',
							skillId,
							skillHash,
							message: 'The skill changed since you read it. Call get_skill before retrying.',
						};
					}
				}),
		});

		registerTool({
			name: 'delete_skill',
			config: {
				description:
					'Permanently delete a skill from the skills hub. Refused while an Agent uses it.',
				inputSchema: skillIdInput,
				annotations: {
					title: 'Delete Skill',
					readOnlyHint: false,
					destructiveHint: true,
					idempotentHint: true,
					openWorldHint: false,
				},
			},
			handler: async ({ skillId }) =>
				await this.run(user, 'delete_skill', { skillId }, async () => {
					await this.skillsApi.delete(user, skillId, 'mcp');
					return { deleted: true, skillId };
				}),
		});
	}

	private async run(
		user: User,
		toolName: string,
		parameters: Record<string, unknown>,
		action: () => Promise<Record<string, unknown>>,
	) {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: toolName,
			parameters,
		};
		try {
			const data = await action();
			telemetryPayload.results = { success: data.ok !== false };
			this.telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return toolResult(data, data.ok === false);
		} catch (error) {
			return trackAndReturnToolError(this.telemetry, telemetryPayload, error, (message) => ({
				ok: false,
				code: 'skill_tool_error',
				error: message,
			}));
		}
	}
}
