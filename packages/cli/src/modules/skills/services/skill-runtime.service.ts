import type { AgentSkill } from '@n8n/api-types';
import { ProjectScopeService } from '@n8n/backend-services';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	SkillRepository,
	type AssistantSkillAccess,
} from '../database/repositories/skill.repository';
import {
	toAgentSkill,
	type AssistantSkillContent,
	type AssistantSkillContext,
	type AssistantSkillFileContent,
	type AssistantSkillSummary,
	type ResolvedSkillRow,
	type SkillRef,
	type SkillTarget,
} from '../utils/skill-content';
import { SkillAccessService } from './skill-access.service';

/**
 * What agents and n8n Assistant read to run skills. Agent reads have no permission check:
 * the agents module checked access when it attached the skill. Assistant reads check the
 * project scopes of the session and the access to each skill.
 */
@Service()
export class SkillRuntimeService {
	constructor(
		private readonly skillRepository: SkillRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly skillAccess: SkillAccessService,
	) {}

	async listForAssistant(context: AssistantSkillContext): Promise<AssistantSkillSummary[]> {
		return await this.skillRepository.findAssistantSkillSummaries(
			await this.authorizedAssistantProject(context),
		);
	}

	/** Reads the requested version, or the latest saved version when `versionId` is absent. */
	async readForAssistant(
		context: AssistantSkillContext,
		skillId: string,
		versionId?: string,
	): Promise<AssistantSkillContent | null> {
		const projectId = await this.authorizedAssistantProject(context);
		const row = await this.skillRepository.findAssistantSkill(skillId, projectId, versionId);
		if (!row) return null;
		const { skill, version, files } = row;
		if (!(await this.canReadForAssistant(context, skill, projectId))) return null;
		return {
			id: skill.id,
			projectId: skill.projectId,
			name: version.name,
			description: version.description,
			versionId: version.id,
			version: version.version,
			instructions: version.instructions,
			frontmatter: version.frontmatter,
			files: files.map(({ path }) => ({ path })),
		};
	}

	async readFileForAssistant(
		context: AssistantSkillContext,
		skillId: string,
		versionId: string,
		path: string,
	): Promise<AssistantSkillFileContent | null> {
		const projectId = await this.authorizedAssistantProject(context);
		const row = await this.skillRepository.findAssistantSkillFile(
			skillId,
			projectId,
			versionId,
			path,
		);
		if (!row || !(await this.canReadForAssistant(context, row.skill, projectId))) return null;
		return { skillId, versionId, path: row.file.path, content: row.file.content };
	}

	/**
	 * What an agent draft runs, keyed by ref id: the latest version, or the pinned version
	 * of a ref with `versionId`. A pin to a version of another skill falls back to the latest.
	 */
	async resolveForAgentDraft(
		refs: SkillRef[],
		ctx: OperationContext = {},
	): Promise<Record<string, AgentSkill>> {
		const rows = await this.resolveRows(refs, ctx);
		return Object.fromEntries([...rows].map(([refId, row]) => [refId, toAgentSkill(row)]));
	}

	async findTargets(skillIds: string[], ctx: OperationContext = {}) {
		const skills = await this.skillRepository.findByIds(skillIds, ctx);
		return new Map<string, SkillTarget>(
			skills.map(({ id, projectId, agentId }) => [id, { projectId, agentId }]),
		);
	}

	async lockForEdit(skillIds: string[], ctx: OperationContext): Promise<void> {
		await this.skillRepository.lockForEdit(skillIds, ctx);
	}

	async lockForAttach(skillIds: string[], ctx: OperationContext): Promise<void> {
		await this.skillRepository.lockForPublish(skillIds, ctx);
	}

	async resolveVersions(versionIds: string[], ctx: OperationContext = {}) {
		const rows = await this.skillRepository.findVersionsByIds(versionIds, ctx);
		return new Map(
			[...rows].map(([versionId, row]) => [
				versionId,
				{ skillId: row.skill.id, skill: toAgentSkill(row) },
			]),
		);
	}

	async findVersionNumbers(versionIds: string[], ctx: OperationContext = {}) {
		return await this.skillRepository.findVersionNumbers(versionIds, ctx);
	}

	/** The names agents see: those of the latest versions. */
	async latestNames(skillIds: string[], ctx: OperationContext) {
		const rows = await this.skillRepository.findLatestSaved(skillIds, ctx);
		return new Map([...rows].map(([id, row]) => [id, row.version.name]));
	}

	/**
	 * The name each ref runs under: its pinned version's name, else the latest. Works per
	 * ref, because one agent can pin a skill that another agent follows.
	 */
	async runtimeNames(
		refs: Array<{ id: string; versionId?: string | null }>,
		ctx: OperationContext,
	): Promise<(ref: { id: string; versionId?: string | null }) => string | undefined> {
		const latest = await this.latestNames(
			refs.map((ref) => ref.id),
			ctx,
		);
		const pinned = await this.skillRepository.findVersionsByIds(
			refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : [])),
			ctx,
		);
		return (ref) => {
			const pin = ref.versionId ? pinned.get(ref.versionId) : undefined;
			return pin?.skill.id === ref.id ? pin.version.name : latest.get(ref.id);
		};
	}

	/**
	 * Publish, step 1: the version id each ref resolves to, keyed by ref id. Publish
	 * creates no version. Needs the caller's transaction for the publish lock.
	 */
	async snapshotForPublish(refs: SkillRef[], ctx: OperationContext): Promise<Map<string, string>> {
		const refIds = [...new Set(refs.map((ref) => ref.id))];
		await this.skillRepository.lockForPublish(refIds, ctx);
		// The same rule as `resolveRows`, without loading the content that publish does not use.
		const latest = await this.skillRepository.findLatestVersionIds(refIds, ctx);
		const pinnedSkillIds = await this.skillRepository.findSkillIdsOfVersions(
			refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : [])),
			ctx,
		);
		const versionByRef = new Map<string, string>();
		for (const ref of refs) {
			const versionId =
				ref.versionId && pinnedSkillIds.get(ref.versionId) === ref.id
					? ref.versionId
					: latest.get(ref.id);
			if (versionId) versionByRef.set(ref.id, versionId);
		}
		return versionByRef;
	}

	private async resolveRows(
		refs: SkillRef[],
		ctx: OperationContext,
	): Promise<Map<string, ResolvedSkillRow>> {
		const latest = await this.skillRepository.findLatestSaved(
			refs.map((ref) => ref.id),
			ctx,
		);
		const pinnedIds = refs.flatMap((ref) => (ref.versionId ? [ref.versionId] : []));
		const pinned = await this.skillRepository.findVersionsByIds(pinnedIds, ctx);
		const rows = new Map<string, ResolvedSkillRow>();
		for (const ref of refs) {
			const pin = ref.versionId ? pinned.get(ref.versionId) : undefined;
			const row = pin?.skill.id === ref.id ? pin : latest.get(ref.id);
			if (row) rows.set(ref.id, row);
		}
		return rows;
	}

	private async canReadForAssistant(
		context: AssistantSkillContext,
		skill: AssistantSkillAccess,
		projectId: string | null,
	): Promise<boolean> {
		return (
			skill.agentId === null &&
			skill.availableToAssistant &&
			(skill.projectId === null || skill.projectId === projectId) &&
			(await this.skillAccess.canAccess(context.user, skill, 'read'))
		);
	}

	private async authorizedAssistantProject({
		user,
		projectId,
	}: AssistantSkillContext): Promise<string | null> {
		if (!projectId) return null;
		const projects = await this.projectScopeService.getProjectIds(user, [
			'projectSkill:list',
			'projectSkill:read',
		]);
		return projects === null || projects.includes(projectId) ? projectId : null;
	}
}
