import {
	agentSkillSchema,
	type AgentJsonConfig,
	type AgentSkill,
	type StoredAgentConfig,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	LockedError,
	NotFoundError,
	UserError,
} from '@n8n/errors';

import { SkillAccessService, SkillService, SkillUsageProxy } from '@/modules/skills';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentConfigService } from './agent-config.service';
import type {
	AgentProposalApplyProgress,
	AgentProposalApplyResult,
	AgentProposalBase,
	AgentProposalBaseResult,
	AgentProposalBaseSkill,
	AgentProposalBaseTool,
	AgentProposalEdit,
	AgentProposalEditInput,
	AgentProposalNormalizeResult,
	AgentProposalUnavailableReason,
} from './agent-proposal.contracts';
import { AgentPublishService } from './agent-publish.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentWriteLockService } from './agent-write-lock.service';
import type { AgentHistory } from './entities/agent-history.entity';
import type { ProjectAgent } from './entities/agent.entity';
import { toAgentDocument } from './json-config/agent-document';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentPublishHistoryRepository } from './repositories/agent-publish-history.repository';
import { AgentSkillRepository } from './repositories/agent-skill.repository';
import { AgentRepository } from './repositories/agent.repository';
import {
	getAgentConfigHash,
	getAgentSkillHash,
	isSameAgentConfig,
} from './utils/agent-config-hash';
import { isAgentDraftClean } from './utils/agent-draft-clean';
import { agentToolModelName, applyAgentEdits } from './utils/agent-proposal-edits';

const OLDER_SKILL_VERSION = 'The agent uses an older version of this skill.';
const MCP_NOT_EDITABLE =
	'The description of an MCP server is not sent to the model. It cannot be edited.';

type PublishedAgent = {
	agent: ProjectAgent;
	version: AgentHistory;
	/** The config of the published version. */
	schema: StoredAgentConfig;
};

type LoadedBase = {
	base: AgentProposalBase;
	/** The published document and the pinned skill bodies, as `applyAgentEdits` takes them. */
	document: AgentJsonConfig;
	skills: Record<string, AgentSkill>;
};

type SkillEdit = Extract<AgentProposalEdit, { kind: 'skill' }>;

type ApplyInput = {
	projectId: string;
	agentId: string;
	baseVersionId: string;
	edits: AgentProposalEdit[];
	progress: AgentProposalApplyProgress;
};

function editTarget(edit: AgentProposalEditInput): string {
	if (edit.kind === 'instructions') return 'the instructions';
	if (edit.kind === 'toolDescription') return `the ${edit.toolType} tool "${edit.toolName}"`;
	return `the ${edit.field} of the skill "${edit.skillId}"`;
}

/**
 * Edits to the published version of an agent that a caller prepares, tests and
 * then applies. The caller keeps the edit list and the apply progress. This
 * service keeps no state.
 */
@Service()
export class AgentProposalService {
	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly agentSkillRepository: AgentSkillRepository,
		private readonly publishHistory: AgentPublishHistoryRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly configService: AgentConfigService,
		private readonly agentSkills: AgentSkillsService,
		private readonly publishService: AgentPublishService,
		private readonly writeLock: AgentWriteLockService,
		private readonly skillService: SkillService,
		private readonly skillUsage: SkillUsageProxy,
		private readonly skillAccess: SkillAccessService,
		private readonly agentHistory: AgentHistoryRepository,
	) {}

	/** Read the published version of an agent. The agent draft must equal that version. */
	async readBase(user: User, projectId: string, agentId: string): Promise<AgentProposalBaseResult> {
		const loaded = await this.loadBase(user, projectId, agentId);
		return 'unavailable' in loaded ? loaded : { base: loaded.base };
	}

	/**
	 * Check proposed edits against the published version and fill `before` from it.
	 * The result has all errors, so the caller can correct them in one step.
	 */
	async normalizeEdits(
		user: User,
		projectId: string,
		agentId: string,
		baseVersionId: string,
		edits: AgentProposalEditInput[],
	): Promise<AgentProposalNormalizeResult> {
		const loaded = await this.loadBase(user, projectId, agentId);
		if ('unavailable' in loaded) {
			return { errors: [`The agent cannot be edited (${loaded.unavailable}).`] };
		}
		const { base, document, skills } = loaded;
		if (base.versionId !== baseVersionId) {
			return { errors: ['The published version of the agent changed.'] };
		}

		const errors: string[] = [];
		const normalized: AgentProposalEdit[] = [];
		const targets = new Set<string>();
		for (const edit of edits) {
			const target = editTarget(edit);
			if (targets.has(target)) {
				errors.push(`More than one edit changes ${target}.`);
				continue;
			}
			targets.add(target);
			const result = this.normalizeEdit(edit, base);
			if (typeof result === 'string') errors.push(result);
			else if (result.after === result.before) errors.push(`The edit does not change ${target}.`);
			else normalized.push(result);
		}
		if (errors.length > 0) return { errors };

		// Find at test time a value that the save at apply time would reject.
		const edited = applyAgentEdits(document, skills, normalized);
		if (normalized.some((edit) => edit.kind !== 'skill')) {
			const validation = await this.configService.validateConfig(edited.config);
			if (!validation.valid) errors.push(validation.error);
		}
		const editedSkillIds = new Set(
			normalized.flatMap((edit) => (edit.kind === 'skill' ? [edit.skillId] : [])),
		);
		for (const skillId of editedSkillIds) {
			const parsed = agentSkillSchema.safeParse(edited.skills[skillId]);
			if (!parsed.success) {
				const issues = parsed.error.issues.map((issue) => issue.message).join(' ');
				errors.push(`The skill "${skillId}" is not valid: ${issues}`);
			}
		}
		return errors.length > 0 ? { errors } : { edits: normalized };
	}

	/** Whether edits that were tested on `baseVersionId` can still be applied. */
	async checkApplicable(
		user: User,
		projectId: string,
		agentId: string,
		baseVersionId: string,
	): Promise<'ok' | 'outdated' | AgentProposalUnavailableReason> {
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) return 'not_found';
		const published = await this.loadPublished(projectId, agentId);
		if ('unavailable' in published) return published.unavailable;
		if (published.agent.activeVersionId !== baseVersionId) return 'outdated';
		if (!(await isAgentDraftClean(published.agent, this.skillRefs))) return 'unpublished_changes';
		return 'ok';
	}

	/**
	 * Save the edits and publish the agent. The result has the progress that the
	 * apply reached, so a later call with that progress does the remaining steps.
	 */
	async apply(user: User, input: ApplyInput): Promise<AgentProposalApplyResult> {
		const progress: AgentProposalApplyProgress = {
			savedSkillIds: [...input.progress.savedSkillIds],
			savedVersionId: input.progress.savedVersionId,
		};
		try {
			return await this.applySteps(user, input, progress);
		} catch (error) {
			if (error instanceof LockedError || error instanceof ConflictError) {
				return { status: 'failed', retryable: true, error: error.message, progress };
			}
			if (
				error instanceof ForbiddenError ||
				error instanceof UserError ||
				error instanceof BadRequestError ||
				error instanceof NotFoundError
			) {
				return { status: 'failed', retryable: false, error: error.message, progress };
			}
			// Return the progress also for an unknown error. Without it, a retry cannot finish.
			this.logger.error('Failed to apply agent proposal', {
				agentId: input.agentId,
				projectId: input.projectId,
				error,
			});
			return {
				status: 'failed',
				retryable: true,
				error: 'The agent change was not applied because of an internal error.',
				progress,
			};
		}
	}

	private async applySteps(
		user: User,
		{ projectId, agentId, baseVersionId, edits }: ApplyInput,
		progress: AgentProposalApplyProgress,
	): Promise<AgentProposalApplyResult> {
		const skillEdits = edits.filter((edit): edit is SkillEdit => edit.kind === 'skill');
		const configEdits = edits.filter((edit) => edit.kind !== 'skill');

		if (!(await userHasScopes(user, ['agent:update', 'agent:publish'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to update and publish this agent.');
		}
		const pendingSkillIds = [...new Set(skillEdits.map((edit) => edit.skillId))].filter(
			(skillId) => !progress.savedSkillIds.includes(skillId),
		);
		// Check the access to all skills before the first write.
		if (pendingSkillIds.length > 0) await this.skillAccess.assertCanEdit(user, pendingSkillIds);
		await this.writeLock.ensureAgentEditable(agentId);

		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent || agent.isArchived || agent.activeVersionId === null) return { status: 'outdated' };
		if (progress.savedVersionId !== null && agent.activeVersionId === progress.savedVersionId) {
			// An earlier call published the saved version, but the caller did not record it.
			return { status: 'published', publishedVersionId: agent.activeVersionId, progress };
		}
		if (agent.activeVersionId !== baseVersionId) return { status: 'outdated' };

		// The draft version that a publish of the draft expects.
		let draftVersionId = agent.versionId;
		if (progress.savedVersionId === null) {
			if (!(await this.isDraftUnchanged(agent, baseVersionId, progress.savedSkillIds))) {
				return { status: 'outdated' };
			}
			draftVersionId = await this.saveSkills(user, agent, skillEdits, pendingSkillIds, progress);
			if (configEdits.length > 0) {
				// Replay the edits on the draft document. The published document is never written.
				const draft = await this.configService.getConfig(agentId, projectId);
				const saved = await this.configService.updateConfig(
					agentId,
					projectId,
					applyAgentEdits(draft, {}, configEdits).config,
					user,
					{ baseConfigHash: getAgentConfigHash(draft), modifiedBy: 'builder' },
				);
				if (saved.versionId !== null && saved.versionId !== baseVersionId) {
					progress.savedVersionId = saved.versionId;
				}
			}
		}

		const published = await this.publish(
			user,
			projectId,
			agentId,
			progress.savedVersionId,
			draftVersionId,
		);
		if (published === null || published === baseVersionId) {
			return {
				status: 'failed',
				retryable: false,
				error: 'The publish step did not publish a new agent version.',
				progress,
			};
		}
		return { status: 'published', publishedVersionId: published, progress };
	}

	/**
	 * With nothing saved, the draft must equal the published version. After this
	 * apply saved skills, the draft follows their new versions, so only the other
	 * skills must have the published pins.
	 */
	private async isDraftUnchanged(
		agent: ProjectAgent,
		baseVersionId: string,
		savedSkillIds: string[],
	): Promise<boolean> {
		if (savedSkillIds.length === 0) return await isAgentDraftClean(agent, this.skillRefs);
		if (agent.versionId !== baseVersionId && !(await this.draftHasBaseContent(agent))) return false;
		const draft = await this.skillRefs.versionSnapshot(agent, {});
		const pins = await this.agentSkillRepository.findPins(baseVersionId, {});
		return (
			pins.length === draft.size &&
			pins.every(({ skillId, skillVersionId }) =>
				savedSkillIds.includes(skillId)
					? draft.has(skillId)
					: draft.get(skillId) === skillVersionId,
			)
		);
	}

	/**
	 * A save of a skill ref that pinned the latest version gives the draft a new
	 * version ID. The content of that version equals the published content.
	 */
	private async draftHasBaseContent(agent: ProjectAgent): Promise<boolean> {
		const base = agent.activeVersion;
		if (!agent.versionId || !base) return false;
		const draft = await this.agentHistory.findByVersionAndAgentId(agent.versionId, agent.id, {});
		if (!draft) return false;
		return isSameAgentConfig(
			{ schema: draft.schema, tools: draft.tools },
			{ schema: base.schema, tools: base.tools },
		);
	}

	/** Saves the pending skills. Returns the draft version ID of the agent after the saves. */
	private async saveSkills(
		user: User,
		agent: ProjectAgent,
		skillEdits: SkillEdit[],
		pendingSkillIds: string[],
		progress: AgentProposalApplyProgress,
	): Promise<string | null> {
		let draftVersionId = agent.versionId;
		if (pendingSkillIds.length === 0) return draftVersionId;
		const { skillRefs, skills } = await this.skillRefs.readDraft(agent, {});
		// The usage of a skill can change after the test. Check all skills before the first write.
		const outdated = await this.skillRefs.findOutdatedSkillIds(skillRefs ?? [], skills, {});
		for (const skillId of pendingSkillIds) {
			const reason = outdated.includes(skillId)
				? OLDER_SKILL_VERSION
				: await this.skillNotEditableReason(user, agent.id, skillId);
			if (reason) throw new UserError(`The skill "${skillId}" cannot be edited. ${reason}`);
		}
		for (const skillId of pendingSkillIds) {
			const current = skills[skillId];
			if (!current) throw new NotFoundError(`Skill "${skillId}" not found`);
			const updates: Partial<AgentSkill> = {};
			for (const edit of skillEdits) {
				if (edit.skillId === skillId) updates[edit.field] = edit.after;
			}
			const changed =
				(updates.description ?? current.description) !== current.description ||
				(updates.instructions ?? current.instructions) !== current.instructions;
			if (changed) {
				const saved = await this.agentSkills.updateSkill(
					agent.id,
					agent.projectId,
					skillId,
					updates,
					{ user, modifiedBy: 'builder' },
					getAgentSkillHash(current),
				);
				// Only the save of a pinned ref changes the draft version of the agent.
				const pinned = skillRefs?.some((ref) => ref.id === skillId && ref.versionId !== undefined);
				if (pinned) draftVersionId = saved.versionId;
			}
			progress.savedSkillIds.push(skillId);
		}
		return draftVersionId;
	}

	/** Returns the published version ID of the agent after the publish. */
	private async publish(
		user: User,
		projectId: string,
		agentId: string,
		savedVersionId: string | null,
		draftVersionId: string | null,
	): Promise<string | null> {
		const emitter = { by: 'builder', trigger: 'explicit' } as const;
		if (savedVersionId !== null) {
			const { agent } = await this.publishService.publishAgent(
				agentId,
				projectId,
				user,
				emitter,
				savedVersionId,
			);
			return agent.activeVersionId;
		}
		// Only skills changed. A publish of the draft captures a version with the new skill pins.
		const draft = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!draft) throw new NotFoundError('Agent not found');
		if (draft.versionId !== draftVersionId) {
			throw new ConflictError('The agent draft changed concurrently. Try again.');
		}
		const { agent } = await this.publishService.publishAgent(
			agentId,
			projectId,
			user,
			emitter,
			undefined,
			undefined,
			draft.revision,
		);
		return agent.activeVersionId;
	}

	private normalizeEdit(
		edit: AgentProposalEditInput,
		base: AgentProposalBase,
	): AgentProposalEdit | string {
		if (edit.kind === 'instructions') return { ...edit, before: base.instructions };

		if (edit.kind === 'toolDescription') {
			if (edit.toolType === 'mcp') return MCP_NOT_EDITABLE;
			const matches = base.tools.filter(
				(tool) => tool.type === edit.toolType && tool.name === edit.toolName,
			);
			if (matches.length > 1) {
				return `The agent has more than one ${edit.toolType} tool with the name "${edit.toolName}".`;
			}
			if (matches.length === 0) {
				return base.tools.some((tool) => tool.type === 'custom' && tool.name === edit.toolName)
					? `"${edit.toolName}" is a custom tool. The description of a custom tool cannot be edited.`
					: `The agent has no ${edit.toolType} tool with the name "${edit.toolName}".`;
			}
			return { ...edit, before: matches[0].description };
		}

		const skill = base.skills.find((candidate) => candidate.id === edit.skillId);
		if (!skill) return `The agent has no skill with the ID "${edit.skillId}".`;
		if (!skill.editable) {
			return `The skill "${skill.name}" cannot be edited. ${skill.notEditableReason ?? ''}`.trim();
		}
		return { ...edit, skillName: skill.name, before: skill[edit.field] };
	}

	private async loadPublished(
		projectId: string,
		agentId: string,
	): Promise<PublishedAgent | { unavailable: AgentProposalUnavailableReason }> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) return { unavailable: 'not_found' };
		if (agent.isArchived) return { unavailable: 'archived' };
		const version = agent.activeVersion;
		if (agent.activeVersionId === null || !version?.schema) return { unavailable: 'not_published' };
		return { agent, version, schema: version.schema };
	}

	private async loadBase(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<LoadedBase | { unavailable: AgentProposalUnavailableReason }> {
		// A user without read access gets the same answer as for a missing agent.
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) {
			return { unavailable: 'not_found' };
		}
		const published = await this.loadPublished(projectId, agentId);
		if ('unavailable' in published) return published;
		const { agent, version, schema } = published;
		if (!(await isAgentDraftClean(agent, this.skillRefs))) {
			return { unavailable: 'unpublished_changes' };
		}

		const { skillRefs, skills } = await this.skillRefs.readVersion(version, {});
		const document = toAgentDocument(schema, skillRefs);
		const publications = await this.publishHistory.findLatestForVersions(
			agentId,
			[version.versionId],
			{},
		);
		const subAgentIds = (document.subAgents?.agents ?? [])
			.filter((ref) => ref.enabled !== false)
			.map((ref) => ref.agentId);
		const subAgents = await this.agentRepository.findSummariesByIds(subAgentIds);

		return {
			document,
			skills,
			base: {
				agentId,
				agentName: agent.name,
				versionId: version.versionId,
				publishedAt: publications.get(version.versionId)?.createdAt ?? version.createdAt,
				model: document.model || null,
				instructions: document.instructions,
				tools: this.baseTools(document, version.tools ?? {}),
				skills: await this.baseSkills(user, agent, skills),
				subAgents: subAgents.map(({ name }) => name),
			},
		};
	}

	private baseTools(
		document: AgentJsonConfig,
		customTools: NonNullable<AgentHistory['tools']>,
	): AgentProposalBaseTool[] {
		const tools: AgentProposalBaseTool[] = [];
		for (const ref of document.tools ?? []) {
			if (ref.enabled === false) continue;
			if (ref.type === 'custom') {
				const descriptor = customTools[ref.id]?.descriptor;
				if (!descriptor) continue;
				tools.push({
					type: 'custom',
					name: descriptor.name,
					description: descriptor.description ?? null,
					editable: false,
				});
			} else {
				tools.push({
					type: ref.type,
					name: agentToolModelName(ref),
					description: ref.description ?? null,
					editable: true,
				});
			}
		}
		for (const server of document.mcpServers ?? []) {
			tools.push({
				type: 'mcp',
				name: server.name,
				description: server.description ?? null,
				editable: false,
			});
		}
		return tools;
	}

	private async baseSkills(
		user: User,
		agent: ProjectAgent,
		skills: Record<string, AgentSkill>,
	): Promise<AgentProposalBaseSkill[]> {
		const draftRefs = await this.skillRefs.refsForDraft(agent, {});
		const outdated = await this.skillRefs.findOutdatedSkillIds(draftRefs, skills, {});
		const result: AgentProposalBaseSkill[] = [];
		for (const [id, skill] of Object.entries(skills)) {
			const notEditableReason = outdated.includes(id)
				? OLDER_SKILL_VERSION
				: await this.skillNotEditableReason(user, agent.id, id);
			result.push({
				id,
				name: skill.name,
				description: skill.description,
				instructions: skill.instructions,
				editable: notEditableReason === undefined,
				...(notEditableReason ? { notEditableReason } : {}),
			});
		}
		return result;
	}

	/** A skill edit changes the skill for all its users, so only a skill of this agent alone is editable. */
	private async skillNotEditableReason(
		user: User,
		agentId: string,
		skillId: string,
	): Promise<string | undefined> {
		const usingAgentIds = await this.skillUsage.findUsingAgentIds(skillId);
		if (usingAgentIds.some((id) => id !== agentId)) return 'Other agents use this skill.';
		let detail;
		try {
			detail = await this.skillService.get(user, skillId);
		} catch (error) {
			if (error instanceof NotFoundError || error instanceof ForbiddenError) {
				return 'The user has no access to this skill.';
			}
			throw error;
		}
		if (detail.syncedFrom !== null) return 'The skill is synced from a source.';
		if (detail.availableToAssistant || detail.availableToMCP) {
			return 'The skill is available to n8n Assistant or MCP.';
		}
		if (!detail.canEdit) return 'The user cannot edit this skill.';
		return undefined;
	}
}
