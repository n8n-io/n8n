import type { PolicyViolation } from './schemas/policy-violation.schema';

/**
 * Response of `GET /workflows/:workflowId/sub-workflows/:subWorkflowId/policy-check`: the
 * policy violations that would refuse a run of the sub-workflow when the parent calls it.
 * Manual runs execute the draft and production runs the published version, so both are judged.
 */
export type SubWorkflowPolicyCheckResponse = {
	/** Name of the sub-workflow's project. Absent for a personal project, whose name holds user data. */
	projectName?: string;
	draft: PolicyViolation[];
	/** `null` when the sub-workflow has no published version. */
	published: PolicyViolation[] | null;
};
