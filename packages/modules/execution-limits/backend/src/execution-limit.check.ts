import { POLICY_VIOLATION_KIND, type PolicyViolation } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { countsTowardExecutionLimit } from '@n8n/backend-services';
import type {
	ExecutionAdmissionContext,
	PolicyCheckResult,
	RegisteredPolicyCheck,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';

import { ExecutionLimitsService } from './execution-limits.service';
import { ExecutionUsageService } from './execution-usage.service';
import type { UsageScope } from './execution-usage';

export const EXECUTION_LIMIT_CHECK_ID = 'execution-limit';

const UNKNOWN_USAGE_ALLOWS_BETWEEN_LOGS = 100;

/**
 * Refuses a run that counts toward an execution limit when its project or the instance has
 * reached the limit. Reads memory only. When it cannot decide, it allows the run and logs.
 *
 * Registered by `ExecutionLimitsModule` only when the licence feature is on.
 */
@PolicyCheck()
export class ExecutionLimitPolicyCheck implements RegisteredPolicyCheck {
	readonly id = EXECUTION_LIMIT_CHECK_ID;

	private unknownUsageAllows = 0;

	constructor(
		private readonly limitsService: ExecutionLimitsService,
		private readonly usageService: ExecutionUsageService,
		private readonly licenseState: LicenseState,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('policy');
	}

	// No `await` in the body: the result settles in the same tick, before any deadline.
	async onExecutionAdmission(context: ExecutionAdmissionContext): Promise<PolicyCheckResult> {
		try {
			return { violations: this.violationsFor(context) };
		} catch (error) {
			this.logger.error('Execution limit check failed, so the run is allowed', {
				error,
				workflowId: context.artifact.id,
				projectId: context.projectId,
			});
			return { violations: [] };
		}
	}

	private violationsFor(context: ExecutionAdmissionContext): PolicyViolation[] {
		// Registered only when licensed at boot. This covers a licence lost while running.
		if (!this.licenseState.isExecutionLimitsLicensed()) return [];

		// Execution limits apply to workflow runs only.
		const { artifact, projectId, mode, source } = context;
		if (artifact.kind !== 'workflow') return [];

		const counts = countsTowardExecutionLimit({
			entityType: 'workflow',
			mode,
			source: source ?? 'none',
			event: 'started',
			outcome: 'none',
		});
		if (!counts) return [];

		const limits = this.limitsService.getApplicableLimits(projectId);
		if (!limits) {
			this.logUnknownUsage('The execution limits are not loaded', context);
			return [];
		}

		const reached = [
			projectId === null
				? null
				: this.reachedLimit({ type: 'project', projectId }, limits.projectMaxExecutions, context),
			this.reachedLimit({ type: 'instance' }, limits.instanceMaxExecutions, context),
		];

		return reached.filter((violation) => violation !== null);
	}

	private reachedLimit(
		scope: UsageScope,
		max: number | null,
		context: ExecutionAdmissionContext,
	): PolicyViolation | null {
		if (max === null) return null;

		const usage = this.usageService.getCachedUsage(scope);
		if (!usage) {
			this.logUnknownUsage(`The ${scope.type} execution usage is not loaded`, context);
			return null;
		}
		if (usage.executions < max) return null;

		const resetsAt = usage.period.resetsAt.toISOString();

		return {
			kind: POLICY_VIOLATION_KIND.executionLimit,
			checkId: this.id,
			message: `The execution limit of this ${scope.type} is reached (${usage.executions} of ${max}). It resets at ${resetsAt}.`,
			scope: scope.type,
			...(context.projectId === null ? {} : { projectId: context.projectId }),
			limit: max,
			usage: usage.executions,
			resetsAt,
		};
	}

	// A cold or failing cache would otherwise log at every run start.
	private logUnknownUsage(message: string, context: ExecutionAdmissionContext): void {
		if (this.unknownUsageAllows++ % UNKNOWN_USAGE_ALLOWS_BETWEEN_LOGS !== 0) return;

		this.logger.warn(`${message}, so the run is allowed`, {
			workflowId: context.artifact.id,
			projectId: context.projectId,
		});
	}
}
