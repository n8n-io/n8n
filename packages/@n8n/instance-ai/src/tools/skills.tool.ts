import {
	agentSkillShape,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	SKILLS_MAX_PAGE_SIZE,
	skillScopeSchema,
	type InstanceAiPermissionMode,
	type SkillDetail,
	type SkillListItem,
} from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, InstanceAiSkillService } from '../types';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const DEFAULT_LIST_LIMIT = 50;

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

type ResumeData = z.infer<typeof instanceAiApprovalResumeSchema>;

interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

const skillIdField = z.string().describe('The skill ID from the list action');

const projectIdField = z
	.string()
	.optional()
	.describe(
		'A project ID. list: only skills of this project. create and update: required when scope is project',
	);

const scopeField = z
	.enum(['project', 'instance'])
	.describe(
		'project: one project can use the skill. instance: every project can use it. On update, a new scope moves the skill, which is refused while an agent uses it',
	);

const skillContentShape = {
	name: agentSkillShape.name,
	description: agentSkillShape.description.describe(
		'When an agent should use the skill. Agents read it to decide whether to load the skill',
	),
	instructions: agentSkillShape.instructions.describe('The full instructions, in Markdown'),
	references: agentSkillShape.references,
};

const listAction = z.object({
	action: z.literal('list').describe('Search the skills hub'),
	query: z.string().max(200).optional().describe('Filter by skill name or description'),
	filterByScope: skillScopeSchema.optional().describe('Only skills of this scope'),
	projectId: projectIdField,
	attachableToAgentId: z
		.string()
		.optional()
		.describe(
			'Only the skills this agent may attach. Do not combine with filterByScope or projectId',
		),
	limit: z.number().int().min(1).max(SKILLS_MAX_PAGE_SIZE).optional().describe('Default 50'),
	skip: z.number().int().min(0).optional().describe('Skills to skip, for the next page'),
});

const getAction = z.object({
	action: z
		.literal('get')
		.describe(
			'Read a skill with its instructions, references, skillHash and the agents that use it',
		),
	skillId: skillIdField,
});

const createAction = z.object({
	action: z
		.literal('create')
		.describe('Create a skill in the skills hub. It is not attached to any agent'),
	scope: scopeField,
	projectId: projectIdField,
	skill: z.object(skillContentShape).strict(),
});

const updateAction = z.object({
	action: z
		.literal('update')
		.describe('Save a new version of a skill. Pass only the fields to change'),
	skillId: skillIdField,
	baseSkillHash: z
		.string()
		.describe('skillHash from the get action. The update is refused if the skill changed since'),
	name: skillContentShape.name.optional(),
	description: skillContentShape.description.optional(),
	instructions: skillContentShape.instructions.optional(),
	references: skillContentShape.references,
	scope: scopeField.optional(),
	projectId: projectIdField,
});

const deleteAction = z.object({
	action: z
		.literal('delete')
		.describe('Permanently delete a skill. Refused while an agent uses it'),
	skillId: skillIdField,
});

const allActions = [listAction, getAction, createAction, updateAction, deleteAction] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

type WriteAction = 'create' | 'update' | 'delete';

function requireSkillService(context: InstanceAiContext): InstanceAiSkillService {
	const { skillService } = context;
	if (!skillService) throw new Error('The skills hub is not available on this instance.');
	return skillService;
}

function permissionFor(context: InstanceAiContext, action: WriteAction): InstanceAiPermissionMode {
	const permissions = context.permissions;
	if (action === 'create') return permissions?.createSkill ?? 'require_approval';
	if (action === 'update') return permissions?.updateSkill ?? 'require_approval';
	return permissions?.deleteSkill ?? 'require_approval';
}

function sessionGrantKey(action: WriteAction): string {
	return `${DOMAIN_TOOL_IDS.SKILLS}:${action}`;
}

function summary(item: SkillListItem) {
	return {
		id: item.id,
		name: item.name,
		description: item.description,
		scope: item.scope,
		projectId: item.projectId,
		projectName: item.projectName,
		agentId: item.agentId,
		agentName: item.agentName,
		latestVersion: item.latestVersion,
		usedByAgents: item.usedByAgents,
		canEdit: item.canEdit,
		canDelete: item.canDelete,
	};
}

function details(detail: SkillDetail) {
	return {
		...summary(detail),
		skill: detail.skill,
		skillHash: detail.skillHash,
		usedBy: detail.usedBy,
	};
}

async function withApproval<T>(
	context: InstanceAiContext,
	ctx: ConfirmationToolContext,
	action: WriteAction,
	request: () => Promise<z.infer<typeof confirmationSuspendSchema>>,
	run: () => Promise<T>,
) {
	const permission = permissionFor(context, action);
	if (permission === 'blocked') {
		return { success: false, denied: true, reason: 'Action blocked by admin' };
	}

	const { resumeData } = ctx;
	const sessionGrantAllowed = action !== 'delete';
	const granted =
		sessionGrantAllowed && context.sessionApprovedToolKeys?.has(sessionGrantKey(action)) === true;
	if (permission !== 'always_allow' && !granted && !resumeData) {
		return await ctx.suspend(await request());
	}

	if (resumeData && !resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}

	if (sessionGrantAllowed && resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(sessionGrantKey(action));
	}

	return { success: true, ...(await run()) };
}

function usedByMessage(detail: SkillDetail): string {
	if (detail.usedByAgents === 0) return 'No agent uses it.';
	if (detail.usedByAgents === 1) return '1 agent uses it.';
	return `${detail.usedByAgents} agents use it.`;
}

async function createMessage(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
): Promise<string> {
	if (input.scope === 'instance') return 'Create the skill for every project on this instance';
	if (!input.projectId) return 'Create the skill in the project';
	const project = await context.workspaceService?.getProject?.(input.projectId);
	return `Create the skill in the project "${project?.name ?? input.projectId}"`;
}

async function handleCreate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: ConfirmationToolContext,
) {
	const service = requireSkillService(context);
	return await withApproval(
		context,
		ctx,
		'create',
		async () => ({
			requestId: nanoid(),
			message: await createMessage(context, input),
			resourceName: input.skill.name,
			severity: 'info',
		}),
		async () => ({ skill: details(await service.create(input)) }),
	);
}

async function handleUpdate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'update' }>,
	ctx: ConfirmationToolContext,
) {
	const service = requireSkillService(context);
	const { action: _action, skillId, ...update } = input;
	return await withApproval(
		context,
		ctx,
		'update',
		async () => {
			const current = await service.get(skillId);
			return {
				requestId: nanoid(),
				message: `Save a new version of the skill. ${usedByMessage(current)}`,
				resourceName: current.name,
				severity: 'warning',
			};
		},
		async () => {
			const { skill: _skill, ...saved } = await service.update(skillId, update);
			return { saved };
		},
	);
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete' }>,
	ctx: ConfirmationToolContext,
) {
	const service = requireSkillService(context);
	const current = await service.get(input.skillId);
	if (current.usedByAgents > 0) {
		return {
			success: false,
			refused: true,
			reason: `The skill cannot be deleted: ${usedByMessage(current)} Detach it from every agent first.`,
		};
	}
	return await withApproval(
		context,
		ctx,
		'delete',
		async () => ({
			requestId: nanoid(),
			message: 'Permanently delete the skill',
			resourceName: current.name,
			severity: 'destructive',
		}),
		async () => {
			await service.delete(input.skillId);
			return { skillId: input.skillId };
		},
	);
}

export function createSkillsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(DOMAIN_TOOL_IDS.SKILLS)
		.description(
			'Manage skills in the skills hub: list, get, create, update and delete. A skill is reusable instructions. ' +
				'This tool does not attach a skill to an agent.',
		)
		.input(inputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input: FullInput, ctx: ConfirmationToolContext) => {
			const service = requireSkillService(context);
			switch (input.action) {
				case 'list': {
					const { count, data } = await service.list({
						query: input.query,
						scope: input.filterByScope,
						projectId: input.projectId,
						attachableToAgentId: input.attachableToAgentId,
						limit: input.limit ?? DEFAULT_LIST_LIMIT,
						skip: input.skip ?? 0,
					});
					return { count, skills: data.map(summary) };
				}
				case 'get':
					return details(await service.get(input.skillId));
				case 'create':
					return await handleCreate(context, input, ctx);
				case 'update':
					return await handleUpdate(context, input, ctx);
				case 'delete':
					return await handleDelete(context, input, ctx);
			}
		})
		.build();
}
