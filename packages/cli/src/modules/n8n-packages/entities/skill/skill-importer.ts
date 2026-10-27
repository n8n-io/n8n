import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import type { AgentSkillWriter } from '@/modules/agents/utils/agent-definition';
import {
	findIntroducedNameClashes,
	getSkillHash,
	isSameSkillTarget,
	SkillAccessService,
	skillContentHashOf,
	SkillService,
	type LatestSkill,
	type SkillTarget,
} from '@/modules/skills';

import { skillIssue, type SkillImportPlan, type SkillWrite } from './skill-import.types';
import type { ImportConflictPolicy } from '../../n8n-packages.types';
import type { SerializedSkill } from '../../spec/serialized/skill.schema';
import type {
	AgentImportIssue,
	AgentImportMatchContext,
	AgentPlanItem,
} from '../agent/agent-import.types';
import { decideImportConflictAction } from '../import-conflict-policy';

/** `name` is the skill name the Agents use after the import. */
type SkillDecision =
	| { kind: 'write'; write: SkillWrite; name: string }
	| { kind: 'keep'; name: string }
	| { kind: 'issue'; message: string };

/**
 * Plans and writes the skills that imported Agents reference. Every write goes through
 * `SkillService`, with the permission checks of the skills UI.
 */
@Service()
export class SkillImporter {
	constructor(
		private readonly skillService: SkillService,
		private readonly skillAccess: SkillAccessService,
		private readonly transactionRunner: TransactionRunner,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

	async plan(
		context: AgentImportMatchContext,
		items: AgentPlanItem[],
		packageSkills: SerializedSkill[],
		conflictPolicy: ImportConflictPolicy,
	): Promise<{ plan: SkillImportPlan; issues: AgentImportIssue[] }> {
		const plan: SkillImportPlan = { shared: [], owned: new Map() };
		const active = items.filter(({ action }) => action !== 'skip');
		const users = skillUsers(active);
		const decisions = await this.decideAll(context.projectId, users, packageSkills, conflictPolicy);
		const issues: AgentImportIssue[] = [];
		for (const [skillId, decision] of decisions) {
			const agentIds = users.get(skillId) ?? [];
			if (decision.kind === 'issue') {
				issues.push(...agentIds.map((id) => skillIssue(id, skillId, decision.message)));
			}
			if (decision.kind === 'write') addWrite(plan, decision.write);
		}
		issues.push(...(await this.agentNameClashes(active, decisions)));
		await this.assertCanWrite(context.user, allWrites(plan), context.projectPendingCreation);
		return { plan, issues };
	}

	/** Checks each Agent's skill names as `replaceDraftRefs` does when the Agent is saved. */
	private async agentNameClashes(
		items: AgentPlanItem[],
		decisions: Map<string, SkillDecision>,
	): Promise<AgentImportIssue[]> {
		const issues: AgentImportIssue[] = [];
		for (const item of items) {
			const current = item.existing
				? await this.agentSkillRefs.refsForDraft(item.existing, {})
				: [];
			issues.push(...nameClashIssues(item, decisions, new Set(current.map(({ id }) => id))));
		}
		return issues;
	}

	private async decideAll(
		projectId: string,
		users: Map<string, string[]>,
		packageSkills: SerializedSkill[],
		conflictPolicy: ImportConflictPolicy,
	): Promise<Map<string, SkillDecision>> {
		const decisions = new Map<string, SkillDecision>();
		if (users.size === 0) return decisions;
		const packaged = new Map(packageSkills.map((skill) => [skill.id, skill]));
		const existing = await this.skillService.findLatest([...users.keys()]);
		for (const [skillId, agentIds] of users) {
			const decision = await this.decide(
				projectId,
				skillId,
				agentIds,
				packaged.get(skillId),
				existing.get(skillId),
				conflictPolicy,
			);
			decisions.set(skillId, decision);
		}
		return decisions;
	}

	/**
	 * Rechecks the permission for every planned write, then writes the project and instance
	 * skills. Call it before the Agents are written: the Agent transactions check nothing.
	 * Each new skill version raises the revision of the Agents that follow the skill by one.
	 * Returns how many times the revision of each Agent went up, keyed by Agent ID.
	 */
	async applyShared(user: User, plan: SkillImportPlan): Promise<Map<string, number>> {
		await this.assertCanWrite(user, allWrites(plan));
		const raised = new Map<string, number>();
		if (plan.shared.length === 0) return raised;
		const following = await this.transactionRunner.run({}, async (ctx) => {
			const agentIds: string[] = [];
			for (const write of plan.shared) agentIds.push(...(await this.write(user, write, ctx)));
			return agentIds;
		});
		for (const agentId of following) raised.set(agentId, (raised.get(agentId) ?? 0) + 1);
		await this.skillService.refreshFollowingAgents([...raised.keys()]);
		return raised;
	}

	/** The writer for the skills of one Agent, for that Agent's save transaction. */
	writerFor(user: User, plan: SkillImportPlan, agentId: string): AgentSkillWriter | undefined {
		const writes = plan.owned.get(agentId) ?? [];
		if (writes.length === 0) return undefined;
		const saved = writes.filter(({ base }) => base).map(({ skill }) => skill.id);
		return async (ctx) => {
			// The save transaction attaches the refs again after the writes.
			await this.agentSkillRefs.detachDraftRefs(agentId, saved, ctx);
			for (const write of writes) await this.write(user, write, ctx);
		};
	}

	private async decide(
		projectId: string,
		skillId: string,
		agentIds: string[],
		packaged: SerializedSkill | undefined,
		row: LatestSkill | undefined,
		conflictPolicy: ImportConflictPolicy,
	): Promise<SkillDecision> {
		if (!packaged) {
			return { kind: 'issue', message: `The package does not contain skill "${skillId}".` };
		}
		const name = packaged.skill.name;
		if (packaged.scope === 'agent' && agentIds.some((id) => id !== packaged.agentId)) {
			return { kind: 'issue', message: `Only its own Agent can use skill "${name}".` };
		}
		const target = targetOf(packaged, projectId);
		if (row && !isSameSkillTarget(row.target, target)) {
			return {
				kind: 'issue',
				message: `Skill ID "${skillId}" already belongs to another project, Agent or the instance.`,
			};
		}
		const decision = decideWrite(packaged, target, row, conflictPolicy);
		if (decision.kind !== 'write') return decision;
		if (await this.skillService.isNameTaken(name, target, skillId)) {
			return { kind: 'issue', message: `Another skill in this scope is already named "${name}".` };
		}
		return decision;
	}

	/** The same checks as the skills UI. A pending project gets its creator's project role. */
	private async assertCanWrite(
		user: User,
		writes: SkillWrite[],
		projectPendingCreation = false,
	): Promise<void> {
		const denied: string[] = [];
		for (const write of writes) {
			if (!(await this.canWrite(user, write, projectPendingCreation))) {
				denied.push(`"${write.skill.skill.name}" (${write.skill.id})`);
			}
		}
		if (denied.length > 0) {
			throw new ForbiddenError(
				`You are not allowed to create or edit skills ${denied.join(', ')}.`,
			);
		}
	}

	private async canWrite(
		user: User,
		write: SkillWrite,
		projectPendingCreation: boolean,
	): Promise<boolean> {
		if (write.base) return await this.skillAccess.canAccess(user, write.target, 'update');
		// A skill of one Agent needs only the Agent permission, as in the Agent builder.
		if (write.target.agentId) return true;
		if (projectPendingCreation && write.target.projectId) return true;
		return await this.skillAccess.canCreate(user, write.target.projectId);
	}

	/** Returns the Agents that follow a saved skill. */
	private async write(user: User, write: SkillWrite, ctx: OperationContext): Promise<string[]> {
		const { id, skill, frontmatter } = write.skill;
		if (!write.base) {
			await this.skillService.createTrusted(
				{
					id,
					target: write.target,
					skill,
					frontmatter,
					source: 'import',
					createdById: user.id,
					checkNameTaken: true,
				},
				ctx,
			);
			return [];
		}
		const saved = await this.skillService.saveTrusted(
			id,
			{
				...skill,
				references: skill.references ?? [],
				frontmatter,
				baseSkillHash: write.base.skillHash,
				baseVersionId: write.base.versionId,
				checkedTarget: write.target,
			},
			user.id,
			ctx,
		);
		return saved.followingAgentIds;
	}
}

function decideWrite(
	packaged: SerializedSkill,
	target: SkillTarget,
	row: LatestSkill | undefined,
	conflictPolicy: ImportConflictPolicy,
): SkillDecision {
	const name = packaged.skill.name;
	if (!row) return { kind: 'write', write: { skill: packaged, target }, name };
	const contentHash = skillContentHashOf(packaged.skill, packaged.frontmatter);
	if (contentHash === row.contentHash) return { kind: 'keep', name };
	const { action, blocked } = decideImportConflictAction(conflictPolicy, true);
	if (blocked) {
		return {
			kind: 'issue',
			message: `Skill "${packaged.skill.name}" already exists with different content.`,
		};
	}
	if (action === 'skip') return { kind: 'keep', name: row.skill.name };
	const base = { skillHash: getSkillHash(row.skill), versionId: row.versionId };
	return { kind: 'write', write: { skill: packaged, target, base }, name };
}

/** Skill ID to the IDs of the Agents that reference it. */
function skillUsers(items: AgentPlanItem[]): Map<string, string[]> {
	const users = new Map<string, string[]>();
	for (const item of items) {
		for (const { id } of item.config?.skills ?? []) {
			users.set(id, [...(users.get(id) ?? []), item.sourceAgentId]);
		}
	}
	return users;
}

/** A project skill lands in the destination project. Agent IDs stay the same on import. */
function targetOf(skill: SerializedSkill, projectId: string): SkillTarget {
	if (skill.scope === 'agent') return { projectId: null, agentId: skill.agentId ?? null };
	if (skill.scope === 'project') return { projectId, agentId: null };
	return { projectId: null, agentId: null };
}

function addWrite(plan: SkillImportPlan, write: SkillWrite): void {
	const agentId = write.target.agentId;
	if (!agentId) {
		plan.shared.push(write);
		return;
	}
	plan.owned.set(agentId, [...(plan.owned.get(agentId) ?? []), write]);
}

function allWrites(plan: SkillImportPlan): SkillWrite[] {
	return [...plan.shared, ...[...plan.owned.values()].flat()];
}

/**
 * An Agent cannot add a skill whose name is hard to tell apart from another skill name of
 * the Agent, as in the UI. Clashes among the Agent's current skills alone are allowed.
 * Checks the names the Agent uses after the import, so a kept skill keeps its own name.
 */
function nameClashIssues(
	item: AgentPlanItem,
	decisions: Map<string, SkillDecision>,
	currentIds: Set<string>,
): AgentImportIssue[] {
	const named = (item.config?.skills ?? []).flatMap(({ id }) => {
		const decision = decisions.get(id);
		return decision && decision.kind !== 'issue' ? [{ id, name: decision.name }] : [];
	});
	const current = named.filter(({ id }) => currentIds.has(id)).map(({ name }) => name);
	const added = named.filter(({ id }) => !currentIds.has(id));
	return added.flatMap(({ id, name }, index) => {
		const earlier = [...current, ...added.slice(0, index).map((skill) => skill.name)];
		if (findIntroducedNameClashes(earlier, [name]).length === 0) return [];
		const message = `Skill name "${name}" is hard to tell apart from another skill name of this Agent.`;
		return [skillIssue(item.sourceAgentId, id, message)];
	});
}
