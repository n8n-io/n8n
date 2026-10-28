import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';

export const APPROVAL_EXPIRED_ERROR = 'The approval request expired. The tool was not run.';

export function hasApprovalExpired(
	job: Pick<AgentBackgroundJob, 'kind' | 'timeoutAt' | 'settledAt'>,
	now = Date.now(),
): boolean {
	if (job.kind !== 'approval' || !job.timeoutAt) return false;
	return (job.settledAt?.getTime() ?? now) >= job.timeoutAt.getTime();
}
