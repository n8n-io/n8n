import {
	executionLimitMaxExecutionsSchema,
	executionLimitSettingsSchema,
	type ExecutionLimitSettings,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import {
	isForeignKeyConstraintError,
	ProjectRepository,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import { v7 as uuidv7 } from 'uuid';

import { ExecutionLimitAuditRepository } from './execution-limit-audit.repository';
import { ExecutionLimitPolicyRepository } from './execution-limit-policy.repository';
import {
	diffLimitSettings,
	diffNewProjectsPolicy,
	diffPolicy,
	diffProjectPolicies,
	resolveProjectPolicies,
} from './execution-limit-rules';
import { ExecutionLimitSettingsStore } from './execution-limit-settings.store';
import { ExecutionLimitsSnapshot } from './execution-limits-snapshot';
import type {
	ApplicableLimits,
	AssignablePolicyGroup,
	ExecutionLimitChange,
	Policy,
	PolicyValues,
	RecordedExecutionLimitChange,
} from './execution-limits.types';

type LimitWrite<T> = (
	ctx: OperationContext,
	settings: ExecutionLimitSettings,
) => Promise<{ result: T; changes: ExecutionLimitChange[] }>;

const POLICY_NAME_MAX_LENGTH = 128;

function toValidPolicyValues({ name, maxExecutions }: PolicyValues): PolicyValues {
	const trimmed = name.trim();
	if (trimmed.length === 0 || trimmed.length > POLICY_NAME_MAX_LENGTH) {
		throw new BadRequestError(
			`The policy name must have from 1 to ${POLICY_NAME_MAX_LENGTH} characters`,
		);
	}
	if (!executionLimitMaxExecutionsSchema.safeParse(maxExecutions).success) {
		throw new BadRequestError('The maximum of the policy is out of range');
	}

	return { name: trimmed, maxExecutions };
}

/** A maximum equal to the instance limit is allowed. */
function rejectAboveInstanceLimit(
	policy: PolicyValues,
	{ instanceMaxExecutions }: ExecutionLimitSettings,
): void {
	if (instanceMaxExecutions !== null && policy.maxExecutions > instanceMaxExecutions) {
		throw new BadRequestError(
			`The maximum of the policy is above the instance limit of ${instanceMaxExecutions}`,
		);
	}
}

@Service()
export class ExecutionLimitsService {
	constructor(
		private readonly settingsStore: ExecutionLimitSettingsStore,
		private readonly policyRepository: ExecutionLimitPolicyRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly snapshot: ExecutionLimitsSnapshot,
		private readonly auditRepository: ExecutionLimitAuditRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * The limits that apply to an execution of this project. Reads memory only, so it is safe
	 * at every execution start. `null` means that this process has not loaded the limits yet.
	 * A `null` project has the instance limit only.
	 */
	getApplicableLimits(projectId: string | null): ApplicableLimits | null {
		return this.snapshot.read(projectId);
	}

	/** The period and the instance limit. */
	async getSettings(): Promise<ExecutionLimitSettings> {
		return await this.settingsStore.read({});
	}

	/**
	 * Changes the given settings and keeps the others. A `null` maximum removes that limit.
	 * An instance limit below the maximum of a policy is accepted. The policy stays as it is.
	 */
	async updateSettings(
		changes: Partial<ExecutionLimitSettings>,
		updatedBy: string | null,
		loginId?: string,
	): Promise<ExecutionLimitSettings> {
		return await this.commit(updatedBy, loginId, async (ctx, current) => {
			const merged = executionLimitSettingsSchema.safeParse({ ...current, ...changes });
			if (!merged.success) {
				throw BadRequestError.wrap('The execution limit settings are not valid', merged.error);
			}

			await this.settingsStore.write(merged.data, ctx);

			return { result: merged.data, changes: diffLimitSettings(current, merged.data) };
		});
	}

	/** The maximum cannot be above the instance limit. The name must be free. */
	async createPolicy(
		values: PolicyValues,
		updatedBy: string | null,
		loginId?: string,
	): Promise<Policy> {
		const valid = toValidPolicyValues(values);

		return await this.commit(updatedBy, loginId, async (ctx, settings) => {
			const policy = await this.insertPolicy(valid, settings, ctx);

			return { result: policy, changes: diffPolicy(policy.id, null, policy) };
		});
	}

	/**
	 * Renames a policy, changes its maximum, or both. A new maximum reaches every project
	 * of the policy. A rename is accepted when the maximum is already above the instance limit.
	 */
	async updatePolicy(
		policyId: string,
		changes: Partial<PolicyValues>,
		updatedBy: string | null,
		loginId?: string,
	): Promise<Policy> {
		return await this.commit(updatedBy, loginId, async (ctx, settings) => {
			const current = await this.getPolicyOrFail(policyId, ctx);
			const next = toValidPolicyValues({
				name: changes.name ?? current.name,
				maxExecutions: changes.maxExecutions ?? current.maxExecutions,
			});

			if (next.name !== current.name) await this.rejectUsedName(next.name, ctx);
			if (next.maxExecutions !== current.maxExecutions) {
				rejectAboveInstanceLimit(next, settings);
			}

			const recorded = diffPolicy(policyId, current, next);
			if (recorded.length > 0) await this.policyRepository.updatePolicy(policyId, next, ctx);

			return { result: { id: policyId, ...next }, changes: recorded };
		});
	}

	/** Makes a policy with the same maximum and a new name. It has no assignments. */
	async duplicatePolicy(
		policyId: string,
		name: string,
		updatedBy: string | null,
		loginId?: string,
	): Promise<Policy> {
		return await this.commit(updatedBy, loginId, async (ctx, settings) => {
			const { maxExecutions } = await this.getPolicyOrFail(policyId, ctx);
			const policy = await this.insertPolicy(
				toValidPolicyValues({ name, maxExecutions }),
				settings,
				ctx,
			);

			return { result: policy, changes: diffPolicy(policy.id, null, policy) };
		});
	}

	/** The projects and the groups of the policy then have no policy. */
	async deletePolicy(policyId: string, updatedBy: string | null, loginId?: string): Promise<void> {
		await this.commit(updatedBy, loginId, async (ctx) => {
			const current = await this.getPolicyOrFail(policyId, ctx);
			await this.policyRepository.deletePolicy(policyId, ctx);

			return { result: undefined, changes: diffPolicy(policyId, current, null) };
		});
	}

	/** Gives the policy to each team project. It replaces the policy that a project has. */
	async assignPolicyToProjects(
		policyId: string,
		requestedProjectIds: string[],
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
		const projectIds = [...new Set(requestedProjectIds)];
		const projects = await this.projectRepository.findTypesByIds(projectIds);
		const existing = new Set(projects.map(({ id }) => id));
		const missing = projectIds.filter((id) => !existing.has(id));
		if (missing.length > 0) {
			throw new NotFoundError(`These projects do not exist: ${missing.join(', ')}`);
		}
		const notTeam = projects.filter(({ type }) => type !== 'team').map(({ id }) => id);
		if (notTeam.length > 0) {
			throw new BadRequestError(
				`Only a team project can have an execution limit policy: ${notTeam.join(', ')}`,
			);
		}

		try {
			await this.commit(updatedBy, loginId, async (ctx) => {
				await this.getPolicyOrFail(policyId, ctx);
				const before = await this.findPolicyOfProjects(projectIds, ctx);
				await this.policyRepository.replacePoliciesOfProjects(policyId, projectIds, ctx);

				return { result: undefined, changes: diffProjectPolicies(projectIds, before, policyId) };
			});
		} catch (error) {
			// A project that was deleted after the check above.
			if (isForeignKeyConstraintError(error)) {
				throw new NotFoundError('A project to assign the policy to does not exist');
			}
			throw error;
		}
	}

	/** Removes the policy of the given projects. A project with no policy is ignored. */
	async unassignPolicyFromProjects(
		projectIds: string[],
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
		await this.commit(updatedBy, loginId, this.removePoliciesOf(projectIds));
	}

	/** New team projects then get this policy. Existing projects keep their policy. */
	async assignPolicyToGroup(
		policyId: string,
		group: AssignablePolicyGroup,
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
		await this.commit(updatedBy, loginId, async (ctx) => {
			await this.getPolicyOrFail(policyId, ctx);
			const oldPolicyId = await this.policyRepository.findGroupPolicyId(group, ctx);
			await this.policyRepository.replaceGroupPolicy(policyId, group, ctx);

			return { result: undefined, changes: diffNewProjectsPolicy(oldPolicyId, policyId) };
		});
	}

	async unassignPolicyFromGroup(
		group: AssignablePolicyGroup,
		updatedBy: string | null,
		loginId?: string,
	): Promise<void> {
		await this.commit(updatedBy, loginId, async (ctx) => {
			const oldPolicyId = await this.policyRepository.findGroupPolicyId(group, ctx);
			await this.policyRepository.deleteGroupPolicy(group, ctx);

			return { result: undefined, changes: diffNewProjectsPolicy(oldPolicyId, null) };
		});
	}

	/** Gives a new team project the policy of the `newProjects` group, if there is one. */
	async assignNewProjectsPolicyTo(projectId: string): Promise<void> {
		// Most instances have no group policy, so they do not take the lock.
		if ((await this.policyRepository.findGroupPolicyId('newProjects', {})) === null) return;

		await this.commit(null, undefined, async (ctx) => {
			const policyId = await this.policyRepository.findGroupPolicyId('newProjects', ctx);
			const before = await this.findPolicyOfProjects([projectId], ctx);
			if (policyId === null || before.has(projectId)) return { result: undefined, changes: [] };

			await this.policyRepository.replacePoliciesOfProjects(policyId, [projectId], ctx);

			return { result: undefined, changes: diffProjectPolicies([projectId], before, policyId) };
		});
	}

	/**
	 * Records the policy that a deleted project loses, in the transaction of the delete.
	 * Call the returned function after that transaction commits.
	 */
	async recordPolicyOfDeletedProject(
		projectId: string,
		updatedBy: string | null,
		loginId: string | undefined,
		ctx: OperationContext,
	): Promise<() => Promise<void>> {
		// Most projects have no policy, so their delete does not take the settings lock.
		const policies = await this.policyRepository.findProjectPolicies(ctx, [projectId]);
		if (policies.length === 0) return async () => {};

		const { recorded } = await this.recordIn(
			ctx,
			updatedBy,
			loginId,
			this.removePoliciesOf([projectId]),
		);

		return async () => await this.announce(recorded);
	}

	private removePoliciesOf(projectIds: string[]): LimitWrite<undefined> {
		return async (ctx) => {
			const before = await this.findPolicyOfProjects(projectIds, ctx);
			await this.policyRepository.deletePoliciesOfProjects(projectIds, ctx);

			return { result: undefined, changes: diffProjectPolicies(projectIds, before, null) };
		};
	}

	private async findPolicyOfProjects(projectIds: string[], ctx: OperationContext) {
		const rows = await this.policyRepository.findProjectPolicies(ctx, projectIds);

		return resolveProjectPolicies(rows).byProject;
	}

	private async insertPolicy(
		values: PolicyValues,
		settings: ExecutionLimitSettings,
		ctx: OperationContext,
	): Promise<Policy> {
		await this.rejectUsedName(values.name, ctx);
		rejectAboveInstanceLimit(values, settings);

		const policy = { id: uuidv7(), ...values };
		await this.policyRepository.insertPolicy(policy, ctx);

		return policy;
	}

	private async getPolicyOrFail(policyId: string, ctx: OperationContext): Promise<Policy> {
		const policy = await this.policyRepository.findPolicy(policyId, ctx);
		if (!policy) throw new NotFoundError(`The execution limit policy ${policyId} does not exist`);

		return policy;
	}

	// Each write holds the settings lock, so no other write can take the name after this.
	private async rejectUsedName(name: string, ctx: OperationContext): Promise<void> {
		if (await this.policyRepository.findPolicyByName(name, ctx)) {
			throw new ConflictError(`An execution limit policy with the name "${name}" already exists`);
		}
	}

	private async commit<T>(
		updatedBy: string | null,
		loginId: string | undefined,
		write: LimitWrite<T>,
	): Promise<T> {
		const { result, recorded } = await this.transactionRunner.run(
			{},
			async (ctx) => await this.recordIn(ctx, updatedBy, loginId, write),
		);
		await this.announce(recorded);

		return result;
	}

	private async recordIn<T>(
		ctx: OperationContext,
		updatedBy: string | null,
		loginId: string | undefined,
		write: LimitWrite<T>,
	): Promise<{ result: T; recorded: RecordedExecutionLimitChange[] }> {
		const settings = await this.settingsStore.lockAndRead(ctx);
		const { result, changes } = await write(ctx, settings);
		const recorded: RecordedExecutionLimitChange[] = changes.map((change) => ({
			...change,
			updatedBy,
			loginId,
		}));
		await this.auditRepository.append(recorded, ctx);

		return { result, recorded };
	}

	/** Every write ends here after its transaction commits, so the limits in memory reload. */
	private async announce(recorded: RecordedExecutionLimitChange[]): Promise<void> {
		if (recorded.length === 0) return;

		for (const change of recorded) {
			this.eventService.emit('execution-limit-updated', change);
		}
		await this.snapshot.refreshAfterWrite();
	}
}
