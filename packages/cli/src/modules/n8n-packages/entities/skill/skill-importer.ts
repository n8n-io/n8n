import { skillNameKey, type ImportedSkillSummary, type SkillImportIssue } from '@n8n/api-types';
import { TransactionRunner, type OperationContext, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { createHash } from 'node:crypto';

import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import type { AgentSkillWriter } from '@/modules/agents/utils/agent-definition';
import {
	findIntroducedNameClashes,
	getSkillHash,
	isSameSkillTarget,
	SkillAccessService,
	skillContentHashOf,
	SkillService,
	SkillRuntimeService,
	SkillsGate,
	type LatestSkill,
	type SkillTarget,
} from '@/modules/skills';

import {
	skillIssue,
	type SkillImportPlan,
	type SkillWrite,
	type StandaloneSkillPlan,
} from './skill-import.types';
import type { ImportConflictPolicy } from '../../n8n-packages.types';
import type { SerializedSkill } from '../../spec/serialized/skill.schema';
import type {
	AgentImportIssue,
	AgentImportMatchContext,
	AgentPlanItem,
} from '../agent/agent-import.types';
import { decideImportConflictAction } from '../import-conflict-policy';
import { SkillImportFailedError } from '../../engine/import-blocked.error';

/** `id` and `name` are the skill ID and the skill name the Agents use after the import. */
type SkillDecision =
	| { kind: 'write'; write: SkillWrite; id: string; name: string }
	| { kind: 'keep'; id: string; name: string }
	| { kind: 'issue'; message: string };

/** The skill that the import compares and writes, with its latest destination version. */
interface DestinationSkill {
	skill: SerializedSkill;
	row: LatestSkill | undefined;
}

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
		private readonly skillRuntime: SkillRuntimeService,
		private readonly skillsGate: SkillsGate,
	) {}

	async planStandalone(
		user: User,
		selected: { skill: SerializedSkill; projectId: string | null }[],
		deletedSkillIds: string[],
		conflictPolicy: ImportConflictPolicy,
		options: { pendingProjectIds?: Set<string>; allowedProjectIds?: Set<string> } = {},
	): Promise<StandaloneSkillPlan> {
		const plan: StandaloneSkillPlan = {
			writes: { shared: [], sharedUsers: new Set() },
			removals: [],
			checked: [],
			outcomes: [],
			issues: [],
		};
		const ids = [...new Set([...selected.map(({ skill }) => skill.id), ...deletedSkillIds])];
		if (ids.length === 0) return plan;
		if (!this.skillsGate.isEnabled) {
			plan.issues = ids.map((skillId) => ({
				type: 'skill-conflict',
				skillId,
				message: 'Skills are unavailable on this instance.',
			}));
			return plan;
		}
		const existing = await this.skillService.findLatest(ids);
		const names = new Set<string>();
		const issue = (skillId: string, message: string) =>
			plan.issues.push({ type: 'skill-conflict', skillId, message });
		for (const { skill, projectId } of selected) {
			if (deletedSkillIds.includes(skill.id)) {
				issue(skill.id, 'A Skill cannot be imported and removed in the same request.');
				continue;
			}
			const target = { projectId: skill.scope === 'instance' ? null : projectId };
			if (skill.scope === 'project' && target.projectId === null) {
				issue(skill.id, 'A project Skill requires a destination project.');
				continue;
			}
			const row = existing.get(skill.id);
			if (row && !isSameSkillTarget(row.target, target)) {
				issue(skill.id, 'The Skill identity belongs to another scope.');
				continue;
			}
			if (row && !(await this.skillAccess.canAccess(user, target, 'read'))) {
				issue(skill.id, 'You cannot read the destination Skill.');
				continue;
			}
			if (row && (await this.skillService.isSourceManaged(skill.id))) {
				issue(skill.id, 'The destination Skill is managed by a source.');
				continue;
			}
			// Standalone selection keeps the package identity. Agent copies keep their existing rules.
			const decision = decideWrite(skill, target, row, conflictPolicy);
			if (decision.kind === 'issue') {
				issue(skill.id, decision.message);
				continue;
			}
			if (row) plan.checked.push(row);
			if (decision.kind === 'write') {
				const problem = row
					? undefined
					: await this.createNameProblem(skill.id, target, skill.skill.name);
				if (problem) issue(skill.id, problem);
				if (!claimName(names, decision.write))
					issue(skill.id, 'Two selected Skills have the same name in this scope.');
				if (
					!(await this.canWrite(
						user,
						decision.write,
						target.projectId !== null && options.pendingProjectIds?.has(target.projectId) === true,
					))
				)
					issue(skill.id, 'You cannot create or edit this Skill.');
				addWrite(plan.writes, decision.write, skill.id, []);
			}
			plan.outcomes.push({
				sourceSkillId: skill.id,
				localId: decision.id,
				name: decision.name,
				projectId: target.projectId,
				status:
					decision.kind === 'write'
						? row
							? 'updated'
							: 'created'
						: row?.contentHash === skillContentHashOf(skill.skill, skill.frontmatter)
							? 'unchanged'
							: 'skipped',
				followingAgentCount: row ? await this.skillService.countFollowingAgents(row.id) : 0,
			});
		}
		for (const id of new Set(deletedSkillIds)) {
			const row = existing.get(id);
			if (!row) {
				issue(id, 'The requested destination Skill does not exist.');
				continue;
			}
			if (
				row.target.projectId !== null &&
				options.allowedProjectIds &&
				!options.allowedProjectIds.has(row.target.projectId)
			) {
				issue(id, 'The Skill is outside the selected destination projects.');
				continue;
			}
			try {
				await this.skillAccess.requireAccess(user, id, 'delete');
				await this.skillService.assertCanDelete(id);
				if (await this.skillService.isSourceManaged(id)) {
					issue(id, 'The destination Skill is managed by a source.');
					continue;
				}
			} catch (error) {
				if (
					!(
						error instanceof ConflictError ||
						error instanceof ForbiddenError ||
						error instanceof NotFoundError
					)
				)
					throw error;
				issue(id, error.message);
				continue;
			}
			plan.checked.push(row);
			plan.removals.push(row);
			plan.outcomes.push({
				sourceSkillId: id,
				localId: id,
				name: row.skill.name,
				projectId: row.target.projectId,
				status: 'deleted',
				followingAgentCount: 0,
			});
		}
		if (plan.writes.shared.length) {
			try {
				this.skillService.assertWritable();
			} catch (error) {
				if (!(error instanceof ForbiddenError)) throw error;
				for (const { skill } of plan.writes.shared) issue(skill.id, error.message);
			}
		}
		return plan;
	}

	/** Check the final batch in save order, after standalone and Agent writes are combined. */
	async renameIssues(writes: SkillWrite[]): Promise<SkillImportIssue[]> {
		const updates = writes.filter((write) => write.base);
		if (updates.length === 0) return [];
		const existing = await this.skillService.findLatest(updates.map(({ skill }) => skill.id));
		const plannedNames = new Map<string, string>();
		const issues: SkillImportIssue[] = [];
		for (const { skill, target } of updates) {
			const row = existing.get(skill.id);
			if (!row) continue;
			const message = await this.renameProblem(
				skill.id,
				target,
				row.skill.name,
				skill.skill.name,
				plannedNames,
			);
			if (message) issues.push({ type: 'skill-conflict', skillId: skill.id, message });
			plannedNames.set(skill.id, skill.skill.name);
		}
		return issues;
	}

	async applyStandalone(user: User, plan: StandaloneSkillPlan): Promise<ImportedSkillSummary[]> {
		if (plan.issues.length)
			throw new UserError('Resolve the Skill conflicts before applying the plan.');
		if (plan.outcomes.length === 0) return [];
		if (!this.skillsGate.isEnabled) throw new UserError('Skills are unavailable on this instance.');
		await this.assertCanWrite(user, plan.writes.shared);
		for (const row of plan.removals) await this.skillAccess.requireAccess(user, row.id, 'delete');
		const following = await this.transactionRunner.run({}, async (ctx) => {
			await this.skillRuntime.lockForEdit(
				plan.checked.map(({ id }) => id),
				ctx,
			);
			// Domain writers recheck updated and removed rows under these locks.
			const writtenIds = new Set([
				...plan.writes.shared.map(({ skill }) => skill.id),
				...plan.removals.map(({ id }) => id),
			]);
			const kept = plan.checked.filter(({ id }) => !writtenIds.has(id));
			const latest = await this.skillService.findLatest(
				kept.map(({ id }) => id),
				ctx,
			);
			for (const checked of kept) {
				const current = latest.get(checked.id);
				if (
					!current ||
					current.versionId !== checked.versionId ||
					!isSameSkillTarget(current.target, checked.target)
				) {
					throw new ConflictError('A Skill changed after planning. Review the import again.');
				}
			}
			for (const checked of plan.checked) {
				if (await this.skillService.isSourceManaged(checked.id, ctx)) {
					throw new ConflictError('The destination Skill is now managed by a source.');
				}
			}
			const followingIds: string[] = [];
			for (const write of plan.writes.shared)
				followingIds.push(...(await this.write(user, write, ctx)));
			for (const row of plan.removals) await this.skillService.deleteChecked(row, ctx);
			return followingIds;
		});
		try {
			if (following.length) await this.skillService.refreshFollowingAgents([...new Set(following)]);
		} catch (error) {
			throw new SkillImportFailedError(error, plan.outcomes);
		}
		return plan.outcomes;
	}

	async plan(
		context: AgentImportMatchContext,
		items: AgentPlanItem[],
		packageSkills: SerializedSkill[],
		conflictPolicy: ImportConflictPolicy,
	): Promise<{ plan: SkillImportPlan; issues: AgentImportIssue[]; copyIds: Map<string, string> }> {
		const plan: SkillImportPlan = {
			shared: [],
			sharedUsers: new Set(),
		};
		const active = items.filter(({ action }) => action !== 'skip');
		const users = skillUsers(active);
		const decisions = await this.decideAll(context.projectId, users, packageSkills, conflictPolicy);
		const issues: AgentImportIssue[] = [];
		for (const [skillId, decision] of decisions) {
			const agentIds = users.get(skillId) ?? [];
			if (decision.kind === 'issue') {
				issues.push(...agentIds.map((id) => skillIssue(id, skillId, decision.message)));
			}
			if (decision.kind === 'write') addWrite(plan, decision.write, skillId, agentIds);
		}
		issues.push(...(await this.agentNameClashes(active, decisions)));
		await this.assertCanWrite(context.user, plan.shared, context.projectPendingCreation);
		return { plan, issues, copyIds: copyIdsOf(decisions) };
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
		if (!this.skillsGate.isEnabled) {
			for (const skillId of users.keys())
				decisions.set(skillId, {
					kind: 'issue',
					message: 'Skills are unavailable on this instance.',
				});
			return decisions;
		}
		const packaged = new Map(packageSkills.map((skill) => [skill.id, skill]));
		const existing = await this.skillService.findLatest([...users.keys()]);
		const plannedNames = new Set<string>();
		for (const skillId of users.keys()) {
			const decision = await this.decide(
				projectId,
				skillId,
				packaged.get(skillId),
				existing.get(skillId),
				conflictPolicy,
			);
			const clashes = decision.kind === 'write' && !claimName(plannedNames, decision.write);
			decisions.set(skillId, clashes ? packageNameClash(decision.name) : decision);
		}
		return decisions;
	}

	/**
	 * Rechecks the permission for every planned write, then writes the project and instance
	 * skills. Call it before the Agents are written: the Agent transactions check nothing.
	 */
	async applyShared(user: User, plan: SkillImportPlan): Promise<void> {
		await this.assertCanWrite(user, plan.shared);
		if (plan.shared.length === 0) return;
		const following = await this.transactionRunner.run({}, async (ctx) => {
			// Lock every existing row before a create or save takes the name lock.
			await this.skillRuntime.lockForEdit(
				plan.shared.filter((write) => write.base).map((write) => write.skill.id),
				ctx,
			);
			const agentIds: string[] = [];
			for (const write of plan.shared) agentIds.push(...(await this.write(user, write, ctx)));
			return agentIds;
		});
		await this.skillService.refreshFollowingAgents([...new Set(following)]);
	}

	/**
	 * The writer for one Agent's save transaction. Absent when the import writes no skill
	 * that the Agent uses. `applyShared` already wrote the skills, so the writer only tells
	 * the save that the skills of the Agent changed.
	 */
	writerFor(plan: SkillImportPlan, agentId: string): AgentSkillWriter | undefined {
		if (!plan.sharedUsers.has(agentId)) return undefined;
		return async () => {};
	}

	private async decide(
		projectId: string,
		skillId: string,
		packaged: SerializedSkill | undefined,
		row: LatestSkill | undefined,
		conflictPolicy: ImportConflictPolicy,
	): Promise<SkillDecision> {
		if (!packaged) {
			return {
				kind: 'issue',
				message: `The package does not contain skill "${skillId}". Export the package again with the skill.`,
			};
		}
		const name = packaged.skill.name;
		const target = targetOf(packaged, projectId);
		const destination = await this.destinationSkill(packaged, target, row);
		if (!destination) {
			return {
				kind: 'issue',
				message: `Skill ID "${skillId}" already belongs to another project or the instance. Change the skill ID in the package, or delete the existing skill.`,
			};
		}
		const { skill, row: current } = destination;
		if (current && (await this.skillService.isSourceManaged(skill.id))) {
			return { kind: 'issue', message: 'The destination Skill is managed by a source.' };
		}
		const decision = decideWrite(skill, target, current, conflictPolicy);
		if (decision.kind !== 'write') return decision;
		const nameProblem = current ? undefined : await this.createNameProblem(skill.id, target, name);
		return nameProblem ? { kind: 'issue', message: nameProblem } : decision;
	}

	/**
	 * A skill ID that another scope owns must not block the import. The import then uses a
	 * copy of the skill in the target scope. A skill with the package ID in the target scope
	 * comes first. A copy from an earlier import comes second, also after the deletion of
	 * the skill that had the package ID. Returns nothing when other scopes own the package
	 * ID and the ID of the copy.
	 */
	private async destinationSkill(
		packaged: SerializedSkill,
		target: SkillTarget,
		row: LatestSkill | undefined,
	): Promise<DestinationSkill | undefined> {
		if (row && isSameSkillTarget(row.target, target)) return { skill: packaged, row };
		const id = copyIdOf(packaged.id, target);
		const copy = (await this.skillService.findLatest([id])).get(id);
		if (copy && isSameSkillTarget(copy.target, target)) {
			return { skill: { ...packaged, id }, row: copy };
		}
		if (!row) return { skill: packaged, row: undefined };
		if (copy) return undefined;
		return { skill: { ...packaged, id }, row: undefined };
	}

	private async createNameProblem(
		skillId: string,
		target: SkillTarget,
		name: string,
	): Promise<string | undefined> {
		if (!(await this.skillService.isNameTaken(name, target, skillId))) return undefined;
		return `Another skill in this scope is already named "${name}". Rename one of the skills.`;
	}

	/** The rename checks of `SkillService.saveTrusted`, so a rename fails in the preview. */
	private async renameProblem(
		skillId: string,
		target: SkillTarget,
		oldName: string,
		newName: string,
		plannedNames?: ReadonlyMap<string, string>,
	): Promise<string | undefined> {
		try {
			await this.skillService.assertCanRename(skillId, target, oldName, newName, {}, plannedNames);
			return undefined;
		} catch (error) {
			if (error instanceof UserError || error instanceof ConflictError) return error.message;
			throw error;
		}
	}

	/** The same checks as the skills UI. A pending project gets its creator's project role. */
	private async assertCanWrite(
		user: User,
		writes: SkillWrite[],
		projectPendingCreation = false,
	): Promise<void> {
		if (writes.length) this.skillService.assertWritable();
		const denied: string[] = [];
		for (const write of writes) {
			if (!(await this.canWrite(user, write, projectPendingCreation))) {
				denied.push(`"${write.skill.skill.name}" (${write.skill.id})`);
			}
		}
		if (denied.length > 0) {
			throw new ForbiddenError(
				`You are not allowed to create or edit skills ${denied.join(', ')}. Ask an admin for skill permissions, or remove these skills from the package.`,
			);
		}
	}

	private async canWrite(
		user: User,
		write: SkillWrite,
		projectPendingCreation: boolean,
	): Promise<boolean> {
		if (write.base) return await this.skillAccess.canAccess(user, write.target, 'update');
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
	const { id } = packaged;
	const name = packaged.skill.name;
	if (!row) return { kind: 'write', write: { skill: packaged, target }, id, name };
	const contentHash = skillContentHashOf(packaged.skill, packaged.frontmatter);
	if (contentHash === row.contentHash) return { kind: 'keep', id, name };
	const { action, blocked } = decideImportConflictAction(conflictPolicy, true);
	if (blocked) {
		return {
			kind: 'issue',
			message: `Skill "${packaged.skill.name}" already exists with different content. Use the conflict policy new-version to save a new version, or skip to keep the existing skill.`,
		};
	}
	if (action === 'skip') return { kind: 'keep', id, name: row.skill.name };
	const base = { skillHash: getSkillHash(row.skill), versionId: row.versionId };
	return { kind: 'write', write: { skill: packaged, target, base }, id, name };
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

/** A project skill lands in the destination project. */
function targetOf(skill: SerializedSkill, projectId: string): SkillTarget {
	return { projectId: skill.scope === 'project' ? projectId : null };
}

/**
 * The ID of the copy of a skill in a target scope. The ID is the same for each import of
 * the skill into the scope, so a second import finds the copy of the first import.
 */
function copyIdOf(sourceSkillId: string, target: SkillTarget): string {
	const hash = createHash('sha256').update(JSON.stringify([sourceSkillId, target.projectId]));
	return `skill_${hash.digest('hex').slice(0, 16)}`;
}

/** Package skill ID to the ID of its copy, for the skills that the import copies. */
function copyIdsOf(decisions: Map<string, SkillDecision>): Map<string, string> {
	const copyIds = new Map<string, string>();
	for (const [skillId, decision] of decisions) {
		if (decision.kind !== 'issue' && decision.id !== skillId) copyIds.set(skillId, decision.id);
	}
	return copyIds;
}

/** Records the name of a planned write. Returns false when another write in its scope has it. */
function claimName(names: Set<string>, { skill, target }: SkillWrite): boolean {
	const key = JSON.stringify([target.projectId, skillNameKey(skill.skill.name)]);
	if (names.has(key)) return false;
	names.add(key);
	return true;
}

function addWrite(
	plan: SkillImportPlan,
	write: SkillWrite,
	packageSkillId: string,
	agentIds: string[],
): void {
	plan.shared.push({ ...write, packageSkillId, usedBy: agentIds });
	for (const id of agentIds) plan.sharedUsers.add(id);
}

function packageNameClash(name: string): SkillDecision {
	return {
		kind: 'issue',
		message: `Another skill of this package has the same name "${name}" in this scope. Rename one of the skills.`,
	};
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
		if (!decision || decision.kind === 'issue') return [];
		// The Agent has the skill when its draft has the ID that the import uses.
		return [{ id, name: decision.name, isCurrent: currentIds.has(decision.id) }];
	});
	const current = named.filter(({ isCurrent }) => isCurrent).map(({ name }) => name);
	const added = named.filter(({ isCurrent }) => !isCurrent);
	return added.flatMap(({ id, name }, index) => {
		const earlier = [...current, ...added.slice(0, index).map((skill) => skill.name)];
		if (findIntroducedNameClashes(earlier, [name]).length === 0) return [];
		const message = `Skill name "${name}" is hard to tell apart from another skill name of this Agent. Rename one of the skills.`;
		return [skillIssue(item.sourceAgentId, id, message)];
	});
}
