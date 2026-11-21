import type {
	ContentImportContext,
	PolicedWorkflow,
	PolicedWorkflowContent,
	PolicyCheckResult,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';
import { evaluateWorkflowRules, getBlockingFindings } from '@n8n/workflow-rules';

import { WorkflowRulesContext } from './workflow-rules-context';
import { WorkflowRulesService } from './workflow-rules.service';

export const WORKFLOW_RULES_CHECK_ID = 'workflow-rules';
export const WORKFLOW_RULE_VIOLATION_KIND = 'workflow-rule';

const NO_VIOLATIONS: PolicyCheckResult = { violations: [] };

/**
 * Blocks a publish or an import that carries a blocking finding. Saves are never checked,
 * because the editor autosaves drafts. Runs are never checked, so a new rule cannot stop
 * a live workflow.
 */
@PolicyCheck()
export class WorkflowRulesPolicyCheck implements RegisteredPolicyCheck {
	readonly id = WORKFLOW_RULES_CHECK_ID;

	constructor(
		private readonly service: WorkflowRulesService,
		private readonly context: WorkflowRulesContext,
	) {}

	async onWorkflowPublish({
		workflow,
		projectId,
		republish,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		// A republish re-adds the live version on restart or leader change. A refusal there
		// would silently stop a running workflow, so only a new version is judged.
		if (republish) return NO_VIOLATIONS;
		return await this.check(workflow, projectId);
	}

	async onContentImport(context: ContentImportContext): Promise<PolicyCheckResult> {
		if (!('workflow' in context)) return NO_VIOLATIONS;
		return await this.check(context.workflow, context.projectId);
	}

	private async check(
		workflow: PolicedWorkflow & PolicedWorkflowContent,
		projectId: string | null,
	): Promise<PolicyCheckResult> {
		if (workflow.artifactKind === 'agent') return NO_VIOLATIONS;

		const state = await this.service.readState();
		const rules = this.service.effectiveRulesFor(state, projectId);
		if (rules.length === 0) return NO_VIOLATIONS;

		const exempted = workflow.id ? state.exemptions.get(workflow.id) : undefined;
		const { findings } = evaluateWorkflowRules(
			workflow,
			rules,
			this.context.evaluateOptions(exempted),
		);

		return {
			violations: getBlockingFindings(findings).map((finding) => ({
				kind: WORKFLOW_RULE_VIOLATION_KIND,
				checkId: WORKFLOW_RULES_CHECK_ID,
				message: finding.message,
				subject: finding.nodeName ?? workflow.name,
				subjectType: finding.nodeName ? 'node' : 'workflow',
				scope: finding.scope,
				matchedRuleId: finding.ruleId,
				...(projectId ? { projectId } : {}),
			})),
			policyVersions: this.service.policyVersions(state, projectId),
		};
	}
}
