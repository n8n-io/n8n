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
import { z } from 'zod';

import { AssistantSkillsFlagGate, SkillService, toSkillToolRefusal } from '@/modules/skills';
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
	scope: z
		.enum(['project', 'instance'])
		.describe('project: one project can use the skill. instance: every project can use it'),
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
		agentId: item.agentId,
		agentName: item.agentName,
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
		private readonly skillService: SkillService,
		private readonly assistantSkillsFlagGate: AssistantSkillsFlagGate,
	) {}

	async registerTools(registerTool: RegisterToolFn, user: User): Promise<void> {
		const assistantSkillsEnabled = await this.assistantSkillsFlagGate.isEnabled();
		const { availableToAssistant: _createAvailability, ...createWithoutAssistant } =
			createSkillInput;
		const { availableToAssistant: _updateAvailability, ...updateWithoutAssistant } =
			updateSkillInput;
		registerTool({
			name: 'search_n8n_skills',
			config: {
				description: 'Search skills. Skills are reusable instructions.',
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
					const { count, data } = await this.skillService.list(
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
					details(await this.skillService.get(user, skillId), assistantSkillsEnabled),
				),
		});

		registerTool({
			name: 'create_skill',
			config: {
				description: 'Create a skill.',
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
						const detail = await this.skillService.create(
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
						const refusal = await toSkillToolRefusal(error);
						if (!refusal) throw error;
						return { ok: false, ...refusal };
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
						const { skill: _skill, ...saved } = await this.skillService.update(
							user,
							skillId,
							SaveSkillDto.parse(update),
							'mcp',
						);
						return saved;
					} catch (error) {
						const refusal = await toSkillToolRefusal(error, {
							baseSkillHash: update.baseSkillHash,
							currentHash: async () => (await this.skillService.get(user, skillId)).skillHash,
						});
						if (!refusal) throw error;
						if (refusal.code !== 'stale_skill') return { ok: false, skillId, ...refusal };
						return {
							ok: false,
							skillId,
							...refusal,
							message: 'The skill changed since you read it. Call get_skill before retrying.',
						};
					}
				}),
		});

		registerTool({
			name: 'delete_skill',
			config: {
				description: 'Permanently delete a skill. Refused while an Agent uses it.',
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
					await this.skillService.delete(user, skillId, 'mcp');
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
