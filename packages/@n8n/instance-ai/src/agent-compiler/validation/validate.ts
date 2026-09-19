import { AgentJsonConfigSchema, RunnableAgentJsonConfigSchema } from '@n8n/api-types';

import type { ValidationIssue, VerificationLevel } from '../../workflow-compiler/validation/report';
import { levelFor } from '../../workflow-compiler/validation/report';
import type { AgentCapabilityCatalog } from '../catalog/capabilities';
import type { CompiledAgent } from '../compiler/compile';
import type { AgentIR } from '../ir/schema';

/** Explicit verification state for an agent artifact. */
export interface AgentVerificationReport {
	schema: VerificationLevel;
	references: VerificationLevel;
	channels: VerificationLevel;
	runnable: VerificationLevel;
	previewScenarios: VerificationLevel;
	publication: VerificationLevel;
	issues: ValidationIssue[];
}

export function emptyAgentVerificationReport(): AgentVerificationReport {
	return {
		schema: 'not_run',
		references: 'not_run',
		channels: 'not_run',
		runnable: 'not_run',
		previewScenarios: 'not_run',
		publication: 'not_run',
		issues: [],
	};
}

const CRON = /^(\S+\s+){4}\S+$/;

/**
 * Static validation of a compiled agent: schema, references into the
 * capability catalog, channel support and credentials, runnability. None of
 * it consults a model.
 */
export function validateCompiledAgent(
	ir: AgentIR,
	compiled: CompiledAgent,
	catalog: AgentCapabilityCatalog,
): AgentVerificationReport {
	const report = emptyAgentVerificationReport();

	const schema: ValidationIssue[] = [];
	const parsed = AgentJsonConfigSchema.safeParse(compiled.config);
	if (!parsed.success) {
		for (const issue of parsed.error.issues.slice(0, 20)) {
			schema.push({
				severity: 'error',
				code: 'schema',
				message: `${issue.path.join('.') || 'config'}: ${issue.message}`,
			});
		}
	}
	for (const task of compiled.tasks) {
		if (!CRON.test(task.cronExpression.trim()))
			schema.push({
				severity: 'error',
				code: 'invalid_cron',
				message: `Task "${task.name}" has an invalid cron expression "${task.cronExpression}".`,
			});
	}
	report.schema = levelFor(schema);
	report.issues.push(...schema);

	const references: ValidationIssue[] = [];
	for (const tool of ir.tools) {
		if (tool.kind === 'workflow') {
			const match = catalog.workflows.find((workflow) =>
				tool.workflowId ? workflow.id === tool.workflowId : workflow.name === tool.workflowName,
			);
			if (!match)
				references.push({
					severity: 'error',
					code: 'workflow_tool_missing',
					message: `Workflow tool "${tool.name}" points at "${tool.workflowName}", which is not attachable in this project.`,
					nodeName: tool.name,
				});
			else if (!match.published)
				references.push({
					severity: 'info',
					code: 'workflow_tool_unpublished',
					message: `Workflow "${match.name}" is not published; a published agent cannot call it until it is.`,
					nodeName: tool.name,
				});
		}
		if (tool.kind === 'node' && !catalog.nodeRegistry.get(tool.operationId)) {
			references.push({
				severity: 'error',
				code: 'unknown_operation',
				message: `Tool "${tool.name}" uses unknown operation "${tool.operationId}".`,
				nodeName: tool.name,
			});
		}
	}
	for (const subAgent of ir.subAgents) {
		if (!catalog.agents.some((agent) => agent.agentId === subAgent.agentId)) {
			references.push({
				severity: 'error',
				code: 'sub_agent_missing',
				message: `Sub-agent ${subAgent.agentId} does not exist in this project.`,
			});
		}
	}
	report.references = levelFor(references);
	report.issues.push(...references);

	const channels: ValidationIssue[] = [];
	const supported = new Set(catalog.channels.map((channel) => channel.type));
	for (const channel of ir.channels) {
		if (!supported.has(channel.type))
			channels.push({
				severity: 'error',
				code: 'channel_unsupported',
				message: `Channel "${channel.type}" is not available on this instance.`,
			});
		else if (!channel.credentialId)
			channels.push({
				severity: 'warning',
				code: 'channel_credential_unresolved',
				message: `Channel "${channel.type}" needs a credential before it can connect.`,
			});
	}
	report.channels = levelFor(channels);
	report.issues.push(...channels);

	const runnable: ValidationIssue[] = [];
	if (!RunnableAgentJsonConfigSchema.safeParse(compiled.config).success) {
		runnable.push({
			severity: 'warning',
			code: 'model_unresolved',
			message: 'The agent has no model and credential yet; it is saved as a draft.',
		});
	}
	for (const warning of compiled.warnings)
		runnable.push({ severity: 'warning', code: 'compile_warning', message: warning });
	report.runnable = levelFor(runnable);
	report.issues.push(...runnable);
	return report;
}

/** Schema-only level for a patched config, appending issues to `into`. */
export function levelForAgentConfig(config: unknown, into: ValidationIssue[]): VerificationLevel {
	const parsed = AgentJsonConfigSchema.safeParse(config);
	const issues: ValidationIssue[] = parsed.success
		? []
		: parsed.error.issues.slice(0, 20).map((issue) => ({
				severity: 'error',
				code: 'schema',
				message: `${issue.path.join('.') || 'config'}: ${issue.message}`,
			}));
	into.push(...issues);
	return levelFor(issues);
}

export function hasBlockingAgentIssues(report: AgentVerificationReport): boolean {
	return report.issues.some((issue) => issue.severity === 'error');
}
