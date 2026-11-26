import {
	agentSkillShape,
	connectPublicSkillSourceSchema,
	discoverPublicSkillSourceSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	projectSkillDetailsForModel,
	SKILL_WORKFLOW_MENTION_HINT,
	skillReferenceReadError,
	SKILLS_MAX_PAGE_SIZE,
	skillReferenceReadShape,
	skillScopeSchema,
	type InstanceAiPermissionMode,
	type SkillDetail,
	type SkillListItem,
	type SkillReferenceRead,
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

const projectIdDescription =
	'A project ID. For list, filters by project. For other actions, required when scope is project and absent otherwise';
const projectIdField = z.string().optional().describe(projectIdDescription);
const scopeDescription =
	'project: one project can use the skill. instance: every project can use it. On update, a new scope moves the skill. The move is refused if an agent that uses the skill cannot use it in the new scope';

const scopeField = skillScopeSchema.describe(scopeDescription);

const availableToAssistantField = z
	.boolean()
	.optional()
	.describe(
		'Allow the n8n Assistant to use the skill. On update, changing only this setting keeps the content version',
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
	action: z.literal('list').describe('Search skills'),
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
			'Read a skill with its instructions, reference paths, bounded text content, skillHash and the agents that use it. Read omitted paths separately with referencePath.',
		),
	skillId: skillIdField,
	...skillReferenceReadShape,
});

const createAction = z.object({
	action: z.literal('create').describe('Create a skill. It is not attached to any agent'),
	scope: scopeField,
	projectId: projectIdField,
	skill: z.object(skillContentShape).strict(),
	availableToAssistant: availableToAssistantField,
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
	references: skillContentShape.references.describe(
		'Replace the text files. Read all parts of the files you want to keep before replacing them. Binary files you do not name stay in the skill.',
	),
	scope: scopeField.optional(),
	projectId: projectIdField,
	availableToAssistant: availableToAssistantField,
});

const deleteAction = z.object({
	action: z
		.literal('delete')
		.describe('Permanently delete a skill. Refused while an agent uses it'),
	skillId: skillIdField,
});

const allActions = [listAction, getAction, createAction, updateAction, deleteAction] as const;

const sourceTargetFields = {
	projectId: discoverPublicSkillSourceSchema.shape.projectId.describe(projectIdDescription),
	scope: scopeField,
};
const listSourcesAction = z.object({ action: z.literal('list-sources') });
const discoverSourceAction = discoverPublicSkillSourceSchema.extend({
	...sourceTargetFields,
	action: z.literal('discover-source'),
});
const importSourceAction = connectPublicSkillSourceSchema.extend({
	...sourceTargetFields,
	action: z.literal('import-from-source'),
});
const sourceActions = [listSourcesAction, discoverSourceAction, importSourceAction] as const;

type FullInput = z.infer<(typeof allActions)[number] | (typeof sourceActions)[number]>;

type WriteAction = 'create' | 'update' | 'delete';

function requireSkillService(context: InstanceAiContext): InstanceAiSkillService {
	const { skillService } = context;
	if (!skillService) throw new Error('Skills are not available on this instance.');
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
		sourceId: item.sourceId,
		syncState: item.syncState,
	};
}

function details(
	detail: SkillDetail,
	assistantSkillsEnabled: boolean,
	reference?: SkillReferenceRead,
) {
	return {
		...summary(detail, assistantSkillsEnabled),
		...projectSkillDetailsForModel(detail.skill, reference),
		skillHash: detail.skillHash,
		usedBy: detail.usedBy,
		syncedFrom: detail.syncedFrom,
	};
}

const BLOCKED_RESULT = { success: false, denied: true, reason: 'Action blocked by admin' };

async function withApproval<T>(
	context: InstanceAiContext,
	ctx: ConfirmationToolContext,
	action: WriteAction,
	request: () => Promise<z.infer<typeof confirmationSuspendSchema>>,
	run: () => Promise<T>,
) {
	const permission = permissionFor(context, action);
	if (permission === 'blocked') return BLOCKED_RESULT;

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

function scopeRefusal(scope: 'project' | 'instance' | undefined, projectId: string | undefined) {
	let reason: string | undefined;
	if (projectId && !scope) reason = 'Pass scope together with projectId.';
	if (scope === 'project' && !projectId) reason = 'A project skill needs a projectId.';
	if (scope === 'instance' && projectId) reason = 'An instance skill has no projectId.';
	return reason ? { success: false, refused: true, reason } : undefined;
}

function changesContent(input: Extract<FullInput, { action: 'update' }>): boolean {
	return [input.name, input.description, input.instructions, input.references].some(
		(field) => field !== undefined,
	);
}

function availabilityMessage(availableToAssistant: boolean | undefined): string {
	if (availableToAssistant === undefined) return '';
	return availableToAssistant
		? ' Allow the n8n Assistant to use it.'
		: ' Stop the n8n Assistant from using it.';
}

async function audience(
	context: InstanceAiContext,
	scope: 'project' | 'instance',
	projectId: string | undefined,
): Promise<string> {
	if (scope === 'instance' || !projectId) return 'for every project on this instance';
	const project = await context.workspaceService?.getProject?.(projectId);
	return `in the project "${project?.name ?? projectId}"`;
}

/** Tell the host that the assistant created or changed a skill, so it shows the skill's tab. */
async function reportChangedSkill(context: InstanceAiContext, skill: { id: string; name: string }) {
	await context.onArtifactChanged?.({ type: 'skill', id: skill.id, name: skill.name });
}

function movesSkill(
	current: SkillDetail,
	scope: 'project' | 'instance',
	projectId: string | undefined,
): boolean {
	return scope !== current.scope || (projectId ?? null) !== current.projectId;
}

async function handleCreate(
	context: InstanceAiContext,
	service: InstanceAiSkillService,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: ConfirmationToolContext,
) {
	const refusal = scopeRefusal(input.scope, input.projectId);
	if (refusal) return refusal;
	return await withApproval(
		context,
		ctx,
		'create',
		async () => ({
			requestId: nanoid(),
			message: `Create the skill ${await audience(context, input.scope, input.projectId)}${input.availableToAssistant ? ', and allow the n8n Assistant to use it' : ''}`,
			resourceName: input.skill.name,
			severity: 'info',
		}),
		async () => {
			const created = details(await service.create(input), service.assistantSkillsEnabled);
			await reportChangedSkill(context, created);
			return { skill: created };
		},
	);
}

async function handleUpdate(
	context: InstanceAiContext,
	service: InstanceAiSkillService,
	input: Extract<FullInput, { action: 'update' }>,
	ctx: ConfirmationToolContext,
) {
	const refusal = scopeRefusal(input.scope, input.projectId);
	if (refusal) return refusal;
	if (permissionFor(context, 'update') === 'blocked') return BLOCKED_RESULT;
	const { action: _action, skillId, ...update } = input;
	const current = await service.get(skillId);
	if (!current.canEdit) {
		return {
			success: false,
			refused: true,
			reason: 'You do not have permission to edit this skill.',
		};
	}
	return await withApproval(
		context,
		ctx,
		'update',
		async () => {
			const move =
				input.scope && movesSkill(current, input.scope, input.projectId)
					? ` Move it, so it is available ${await audience(context, input.scope, input.projectId)}.`
					: '';
			return {
				requestId: nanoid(),
				message: `${changesContent(input) ? 'Save a new version of the skill.' : 'Update the skill.'}${move}${availabilityMessage(input.availableToAssistant)} ${usedByMessage(current)}`,
				resourceName: current.name,
				severity: 'warning',
			};
		},
		async () => {
			const { skill, ...saved } = await service.update(skillId, update);
			await reportChangedSkill(context, { id: saved.id, name: skill.name });
			// The name lets the assistant show the skill tab without a second read.
			return { saved: { ...saved, name: skill.name } };
		},
	);
}

async function handleDelete(
	context: InstanceAiContext,
	service: InstanceAiSkillService,
	input: Extract<FullInput, { action: 'delete' }>,
	ctx: ConfirmationToolContext,
) {
	if (permissionFor(context, 'delete') === 'blocked') return BLOCKED_RESULT;
	const current = await service.get(input.skillId);
	if (!current.canDelete) {
		return {
			success: false,
			refused: true,
			reason: 'You do not have permission to delete this skill.',
		};
	}
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

async function handleImportFromSource(
	context: InstanceAiContext,
	sources: NonNullable<InstanceAiSkillService['sources']>,
	{ action: _action, ...input }: z.infer<typeof importSourceAction>,
	ctx: ConfirmationToolContext,
) {
	if (permissionFor(context, 'create') === 'blocked') return BLOCKED_RESULT;
	const refusal = scopeRefusal(input.scope, input.projectId);
	if (refusal) return refusal;
	if (!ctx.resumeData) {
		// The service applies the import rules, so the card names what the import takes.
		const { source, importable, failed } = await sources.checkImport(input);
		const target = await audience(context, input.scope, input.projectId);
		const { label, ref } = source;
		const names = importable.map(({ name }) => name).join(', ');
		const selection =
			importable.length === 1 ? '1 synced skill' : `${importable.length} synced skills`;
		const leftOut =
			failed.length === 0
				? ''
				: failed.length === 1
					? ' 1 selected skill cannot come in.'
					: ` ${failed.length} selected skills cannot come in.`;
		return await ctx.suspend({
			requestId: nanoid(),
			resourceName: `${label}${ref ? ` · ${ref}` : ''}`,
			message: `Connect this source and import ${selection} ${target}: ${names}.${leftOut}`,
			severity: 'warning',
		});
	}
	if (!ctx.resumeData.approved) {
		return { success: false, denied: true, reason: 'User denied the action' };
	}
	const result = await sources.connect(input);
	for (const { skillId, name } of result.imported) {
		await reportChangedSkill(context, { id: skillId, name });
	}
	return { success: true, ...result };
}

export function createSkillsTool(context: InstanceAiContext) {
	const actions =
		context.skillService?.assistantSkillsEnabled === true
			? allActions
			: ([
					listAction,
					getAction,
					createAction.omit({ availableToAssistant: true }),
					updateAction.omit({ availableToAssistant: true }),
					deleteAction,
				] as const);
	const sources = context.skillService?.sources;
	const inputSchema = sanitizeInputSchema(
		z.discriminatedUnion('action', sources ? [...actions, ...sourceActions] : [...actions]),
	);

	return new Tool(DOMAIN_TOOL_IDS.SKILLS)
		.description(
			'Manage skills: list, get, create, update and delete. A skill is reusable instructions. ' +
				'Before creating a new skill or building an agent, list existing skills (pass ' +
				'attachableToAgentId for an agent) and reuse a matching skill instead of creating a ' +
				'duplicate. This tool does not attach a skill to an agent.' +
				(context.skillService?.workflowsInSkillsEnabled === true
					? ` ${SKILL_WORKFLOW_MENTION_HINT}`
					: '') +
				(sources
					? ' List connected sources or preview a public GitHub link with discover-source. Show the check verdicts to the user. To connect the source, use import-from-source with the same URL, scope and revision, and the selected skills. Only skills that passed come in, and the result lists the others in failed. Review warnings and accept updates in Settings > Context > Skills.'
					: ''),
		)
		.input(inputSchema)
		.untrustedOutput()
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
					return {
						count,
						skills: data.map((item) => summary(item, service.assistantSkillsEnabled)),
					};
				}
				case 'get': {
					const reason = skillReferenceReadError(input);
					if (reason) return { success: false, refused: true, reason };
					return details(await service.get(input.skillId), service.assistantSkillsEnabled, input);
				}
				case 'create':
					return await handleCreate(context, service, input, ctx);
				case 'update':
					return await handleUpdate(context, service, input, ctx);
				case 'delete':
					return await handleDelete(context, service, input, ctx);
				case 'list-sources':
					if (sources) return { sources: await sources.list() };
					break;
				case 'discover-source': {
					const { action: _action, ...target } = input;
					if (sources) return await sources.discover(target);
					break;
				}
				case 'import-from-source':
					if (sources) return await handleImportFromSource(context, sources, input, ctx);
					break;
			}
			throw new Error('Skill Sync is not available.');
		})
		.build();
}
