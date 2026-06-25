import { LicenseState, Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { channelsToPolicy, WorkflowExecuteMode, WorkflowSettings } from 'n8n-workflow';

import type {
	ExecutionRedaction,
	ExecutionRedactionOptions,
	RedactableExecution,
} from '@/executions/execution-redaction';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ScopeForbiddenError } from '@/errors/response-errors/scope-forbidden.error';
import { EventService } from '@/events/event.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type {
	IExecutionRedactionStrategy,
	RedactionContext,
} from './execution-redaction.interfaces';
import { FullItemRedactionStrategy } from './strategies/full-item-redaction.strategy';

const MANUAL_MODES: ReadonlySet<WorkflowExecuteMode> = new Set(['manual']);

/**
 * Orchestrates the execution redaction pipeline with batch permission resolution.
 *
 * Responsibilities:
 *   1. Resolve `userCanReveal` with a single DB call for any number of executions.
 *   2. Build a `RedactionContext` per execution.
 *   3. Construct the strategy pipeline based on policy and request options.
 *   4. Run each strategy in order; strategies own all data mutations.
 *
 * Policy evaluation and permission checks live here.
 * Data transformation lives in the strategies.
 */
@Service()
export class ExecutionRedactionService implements ExecutionRedaction {
	constructor(
		private readonly logger: Logger,
		private readonly licenseState: LicenseState,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
		private readonly fullItemRedactionStrategy: FullItemRedactionStrategy,
	) {}

	async init(): Promise<void> {
		this.logger.debug('Initializing ExecutionRedactionService...');
	}

	/**
	 * Thin wrapper around `processExecutions` for single-execution callers.
	 *
	 * With `keepOriginal: true`, the original execution is never mutated. Returns
	 * either the original (if no redaction needed) or a structuredClone with
	 * redaction applied. Callers can check referential equality to determine
	 * whether redaction occurred.
	 */
	async processExecution(
		execution: RedactableExecution,
		options: ExecutionRedactionOptions,
	): Promise<RedactableExecution> {
		const executions = [execution];
		await this.processExecutions(executions, options);
		return executions[0];
	}

	/**
	 * Processes a list of executions and applies redaction based on the provided options.
	 * A single DB query resolves reveal permissions for any number of executions on both
	 * the redact and reveal paths.
	 *
	 * @param executions - The executions to process (mutated in place)
	 * @param options - Options for redaction processing
	 */
	async processExecutions(
		executions: RedactableExecution[],
		options: ExecutionRedactionOptions,
	): Promise<void> {
		if (executions.length === 0) return;

		// A queued/just-inserted execution row carries no run data yet
		// (`executionData.data` is empty until the runner writes its first
		// snapshot). The repository's unflatten step returns `data: undefined`
		// for those rows. There is nothing to redact and no policy to apply,
		// so short-circuit before any strategy reads `execution.data.*` and
		// crashes on the undefined. Surfaces under parallel evaluations,
		// which leave several rows in `new` state long enough for FE polling
		// to catch them mid-flight.
		const processable = executions.filter(
			(e): e is RedactableExecution & { data: NonNullable<RedactableExecution['data']> } =>
				e.data !== undefined && e.data !== null,
		);
		if (processable.length === 0) return;

		// Single DB call shared by both the reveal and redact paths.
		// Only executions where policy doesn't already grant access need a scope check.
		const needsCheck = processable.filter((e) => !this.policyAllowsReveal(e));
		let revealableIds = new Set<string>();
		if (needsCheck.length > 0) {
			const uniqueWorkflowIds = [...new Set(needsCheck.map((e) => e.workflowId))];
			revealableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
				uniqueWorkflowIds,
				options.user,
				['execution:reveal'],
			);
		}

		// Reveal path: validate all permissions atomically before any processing.
		if (options.redactExecutionData === false) {
			// Dynamic credential executions are only revealable to the user the
			// execution ran as — the `execution:reveal` scope deliberately does
			// not bypass this check.
			for (const execution of processable) {
				if (
					this.hasDynamicCredentials(execution) &&
					!this.isOwnDynamicCredentialsExecution(execution, options.user.id)
				) {
					throw new ForbiddenError();
				}
			}

			for (const execution of needsCheck) {
				if (
					this.hasDynamicCredentials(execution) &&
					this.isOwnDynamicCredentialsExecution(execution, options.user.id)
				) {
					// Owner of a dyncred execution skips the scope check.
					continue;
				}
				if (!revealableIds.has(execution.workflowId)) {
					// Emit audit event before throwing error
					this.eventService.emit('execution-data-reveal-failure', {
						user: options.user,
						executionId: execution.id ?? '',
						workflowId: execution.workflowId,
						ipAddress: options.ipAddress ?? '',
						userAgent: options.userAgent ?? '',
						redactionPolicy: this.resolvePolicy(execution),
						rejectionReason: 'User lacks execution:reveal scope for this workflow',
					});
					throw new ScopeForbiddenError(
						"You do not have permission to reveal execution data. The 'execution:reveal' scope is required.",
						{ errorCode: 'EXECUTION_REVEAL_FORBIDDEN', requiredScope: 'execution:reveal' },
						'Contact a project admin to request the required scope.',
					);
				}
			}
		}

		// Unified pipeline execution. buildPipeline excludes FullItemRedactionStrategy on the
		// reveal path (redactExecutionData === false).

		for (let i = 0; i < executions.length; i++) {
			const execution = executions[i];
			// Pre-filtered above — skip data-less rows so the strategies and
			// dynamic-credential checks below can rely on a populated payload.
			if (execution.data === undefined || execution.data === null) continue;
			const hasDynCreds = this.hasDynamicCredentials(execution);
			const isOwnDynCreds =
				hasDynCreds && this.isOwnDynamicCredentialsExecution(execution, options.user.id);
			const policyAllowsReveal = this.policyAllowsReveal(execution);
			// On dyncred executions, only the executing user may see unredacted data,
			// and the `execution:reveal` scope does not grant a bypass.
			const userCanReveal = hasDynCreds
				? isOwnDynCreds
				: policyAllowsReveal || revealableIds.has(execution.workflowId);
			const enforceDynCredRedaction = hasDynCreds && !isOwnDynCreds;
			const context: RedactionContext = {
				user: options.user,
				redactExecutionData: options.redactExecutionData,
				userCanReveal,
				enforceDynCredRedaction,
				memo: new Map(),
			};
			const pipeline = this.buildPipeline(
				execution,
				context,
				policyAllowsReveal,
				enforceDynCredRedaction,
			);

			// `runtimeData.credentials` carries encrypted credential context that
			// must be stripped from any API response, including for the owner
			// viewing their own dyncred execution. Treat that strip as a reason
			// to clone when `keepOriginal` is set, even if no strategy applies.
			const needsCredentialStrip =
				hasDynCreds && execution.data.executionData?.runtimeData?.credentials !== undefined;

			let target = execution;
			if (options.keepOriginal) {
				const needsClone =
					needsCredentialStrip || pipeline.some((s) => s.requiresRedaction(execution, context));
				if (!needsClone) continue;
				target = structuredClone(execution);
				executions[i] = target;
			}

			for (const strategy of pipeline) {
				await strategy.apply(target, context);
			}

			if (needsCredentialStrip && target.data.executionData?.runtimeData) {
				delete target.data.executionData.runtimeData.credentials;
			}
		}

		// Emit audit events after all executions have been successfully processed.
		// Iterate over `processable` so a queued (data-undefined) row in the
		// batch doesn't trip `resolvePolicy`. There is nothing to "reveal" on
		// a row that carries no payload, so its omission from the audit trail
		// matches reality — the API response for that entry has `data: null`.
		if (options.redactExecutionData === false) {
			for (const execution of processable) {
				this.eventService.emit('execution-data-revealed', {
					user: options.user,
					executionId: execution.id ?? '',
					workflowId: execution.workflowId,
					ipAddress: options.ipAddress ?? '',
					userAgent: options.userAgent ?? '',
					redactionPolicy: this.resolvePolicy(execution),
				});
			}
		}
	}

	/**
	 * Constructs the ordered strategy pipeline for this execution.
	 *
	 * - `FullItemRedactionStrategy` is included when items should be cleared:
	 *   explicit redact (`redactExecutionData === true`), policy=all, or
	 *   policy=non-manual on a non-manual execution mode, or dynamic credentials.
	 *   It is never included on the reveal path (`redactExecutionData === false`).
	 *
	 * Note: `NodeDefinedFieldRedactionStrategy` (node-declared `sensitiveOutputFields`)
	 * is intentionally not wired in here. The previous always-on behaviour broke
	 * partial/single-step execution because the FE replays the redacted push payload
	 * back to the server, and is being redesigned. Re-introduce only after the
	 * product approach (per-workflow gating + partial-run rehydration) is settled.
	 */
	private buildPipeline(
		execution: RedactableExecution,
		context: RedactionContext,
		policyAllowsReveal: boolean,
		enforceDynCredRedaction: boolean,
	): IExecutionRedactionStrategy[] {
		const pipeline: IExecutionRedactionStrategy[] = [];

		const policy = this.resolvePolicy(execution);
		const shouldClearItems =
			context.redactExecutionData !== false &&
			(context.redactExecutionData === true ||
				enforceDynCredRedaction ||
				(!policyAllowsReveal &&
					(policy === 'all' ||
						(policy === 'non-manual' && !MANUAL_MODES.has(execution.mode)) ||
						(policy === 'manual-only' && MANUAL_MODES.has(execution.mode)))));

		if (shouldClearItems) {
			pipeline.push(this.fullItemRedactionStrategy);
		}

		return pipeline;
	}

	/**
	 * Returns true when the execution used dynamic credential resolution.
	 * Such executions must always be redacted with canReveal = false.
	 *
	 * Checks per-node `usedDynamicCredentials` flag which is only set when
	 * resolution actually happened at runtime, rather than checking for the
	 * mere presence of credential context infrastructure.
	 */
	private hasDynamicCredentials(execution: RedactableExecution): boolean {
		return Object.values(execution.data.resultData?.runData ?? {}).some((taskDataList) =>
			taskDataList.some((taskData) => taskData.usedDynamicCredentials),
		);
	}

	/**
	 * Returns true when the requesting user is the one the execution ran as.
	 * Used to grant the executing user access to their own data on executions
	 * that resolved private credentials, where everyone else is still redacted.
	 *
	 * Reads `runtimeData.executedByUserId`, set during credential resolution to
	 * the n8n user a dynamic credential resolved to (covers both manual and
	 * chat-hub runs). It is absent when the resolved identity isn't an n8n user
	 * (external Slack/OAuth resolvers) or when no dynamic credential resolved, so
	 * `undefined` will never strict-equal the requester's id: a single comparison
	 * covers both the "no attributable user" and "different user" cases, falling
	 * back to the redacted-for-everyone default.
	 */
	private isOwnDynamicCredentialsExecution(
		execution: RedactableExecution,
		userId: string,
	): boolean {
		return execution.data.executionData?.runtimeData?.executedByUserId === userId;
	}

	/**
	 * Returns true when the resolved redaction policy inherently allows everyone to access
	 * unredacted data — i.e. the policy would not have redacted the execution in the first
	 * place.  The two cases are:
	 *   - policy === 'none': redaction is completely disabled.
	 *   - policy === 'non-manual' AND the execution mode is manual: manual executions are
	 *     exempt from this policy, so the data is still accessible to all.
	 */
	private policyAllowsReveal(execution: RedactableExecution): boolean {
		const policy = this.resolvePolicy(execution);
		return (
			policy === 'none' ||
			(policy === 'non-manual' && MANUAL_MODES.has(execution.mode)) ||
			(policy === 'manual-only' && !MANUAL_MODES.has(execution.mode))
		);
	}

	/**
	 * Resolves the effective redaction policy for an execution.
	 *
	 * Prefers the snapshot captured in `runtimeData.redaction` at execution time. That snapshot
	 * is versioned: V2 stores per-channel booleans (reconstructed into the policy enum), while
	 * V1 (older executions) stores the policy enum directly. Falls back to `workflowData.settings`
	 * for executions captured before runtime snapshots existed, and defaults to 'none'.
	 * Returns 'none' when the data-redaction license is not active, so that user-configured
	 * policies are not applied without the license.
	 */
	private resolvePolicy(execution: RedactableExecution): WorkflowSettings.RedactionPolicy {
		if (!this.licenseState.isDataRedactionLicensed()) return 'none';

		const redaction = execution.data.executionData?.runtimeData?.redaction;

		if (redaction?.version === 2) {
			return channelsToPolicy({ production: redaction.production, manual: redaction.manual });
		}

		return redaction?.policy ?? execution.workflowData.settings?.redactionPolicy ?? 'none';
	}
}
