import {
	evaluateWorkflowRules,
	exemptedRuleIdsFromBundle,
	resolveRulesFromBundle,
	rulesExportBundleSchema,
	type RuleFinding,
	type RulesExportBundle,
	type RuleWorkflow,
} from '@n8n/workflow-rules';

import type { DiscoveredWorkflow } from './discover';

export interface CheckResult {
	source: string | null;
	workflowId: string | null;
	workflowName: string;
	projectId: string | null;
	findings: RuleFinding[];
	blocking: number;
	warnings: number;
}

export interface CheckSummary {
	workflows: number;
	blocking: number;
	warnings: number;
	passed: boolean;
}

export interface CheckReport {
	results: CheckResult[];
	summary: CheckSummary;
}

/** Reads a file written by `n8n-cli workflow-rules export`. */
export function parseRulesBundle(text: string): RulesExportBundle {
	const result = rulesExportBundleSchema.safeParse(JSON.parse(text));
	if (!result.success) {
		const issues = result.error.issues
			.slice(0, 5)
			.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
			.join('\n');
		throw new Error(`The rules file is not a Workflow Rules export.\n${issues}`);
	}
	return result.data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRuleNode(node: unknown): node is RuleWorkflow['nodes'][number] {
	return isRecord(node) && typeof node.name === 'string' && typeof node.type === 'string';
}

function toRuleWorkflow(workflow: DiscoveredWorkflow['workflow']): RuleWorkflow {
	return {
		id: typeof workflow.id === 'string' ? workflow.id : null,
		name: workflow.name,
		description: typeof workflow.description === 'string' ? workflow.description : null,
		nodes: workflow.nodes.filter(isRuleNode),
		connections: isRecord(workflow.connections) ? workflow.connections : null,
		settings: isRecord(workflow.settings) ? workflow.settings : null,
	};
}

export function summarize(results: CheckResult[]): CheckSummary {
	const blocking = results.reduce((sum, result) => sum + result.blocking, 0);
	return {
		workflows: results.length,
		blocking,
		warnings: results.reduce((sum, result) => sum + result.warnings, 0),
		passed: blocking === 0,
	};
}

/** The same evaluation the instance runs, without the instance. */
export function checkOffline(
	bundle: RulesExportBundle,
	workflows: DiscoveredWorkflow[],
): CheckReport {
	const results = workflows.map(({ file, workflow, projectId }) => {
		const ruleWorkflow = toRuleWorkflow(workflow);
		const workflowId = ruleWorkflow.id ?? null;
		const { findings } = evaluateWorkflowRules(
			ruleWorkflow,
			resolveRulesFromBundle(bundle, projectId),
			{
				exemptedRuleIds: exemptedRuleIdsFromBundle(bundle, workflowId ?? undefined),
				defaults: bundle.defaults,
			},
		);
		const active = findings.filter((finding) => !finding.exempted);
		const blocking = active.filter((finding) => finding.severity === 'block').length;
		return {
			source: file,
			workflowId,
			workflowName: ruleWorkflow.name,
			projectId: projectId ?? null,
			findings,
			blocking,
			warnings: active.length - blocking,
		};
	});
	return { results, summary: summarize(results) };
}
