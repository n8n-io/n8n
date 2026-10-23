import type { AgentConfigValidationIssue, AgentJsonConfig } from '@n8n/api-types';

/**
 * A workflow blocking the publish: its tool is attached, but the workflow has
 * no published version yet.
 */
export type UnpublishedWorkflowTool = {
	/** The workflow's display name. */
	name: string;
	/** Stable workflow id for opening the editor; absent for by-name references. */
	workflowId?: string;
};

/**
 * A warning blocks publishing but not the draft preview: the workflow tool is
 * compatible, its workflow just has no published version yet.
 */
export function isWarningIssue(issue: AgentConfigValidationIssue): boolean {
	return issue.code === 'incompatible_reference' && issue.reason === 'not_published';
}

/** Warning-only issues are resolved by the publish flow itself, so only the rest block it. */
export function hasBlockingIssues(issues: AgentConfigValidationIssue[]): boolean {
	return issues.some((issue) => !isWarningIssue(issue));
}

/**
 * The unpublished workflow tools behind a config validation, for the modal the
 * builder shows instead of a failing publish request. The issue's
 * `capability.id` is the workflow's display name; `capability.index` locates
 * the tool config for its stable workflow id.
 */
export function unpublishedWorkflowTools(
	issues: AgentConfigValidationIssue[],
	tools: NonNullable<AgentJsonConfig['tools']>,
): UnpublishedWorkflowTool[] {
	return issues
		.filter((issue) => isWarningIssue(issue))
		.map((issue) => {
			const tool = issue.capability.index === undefined ? undefined : tools[issue.capability.index];
			const workflowTool = tool?.type === 'workflow' ? tool : undefined;
			return {
				name: workflowTool?.workflow ?? issue.capability.id ?? '',
				workflowId: workflowTool?.workflowId,
			};
		})
		.filter((workflow) => workflow.name !== '');
}
