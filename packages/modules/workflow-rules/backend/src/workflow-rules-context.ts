import { NodeTypesProxy } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { EvaluateOptions, RuleDefaults, RuleNode } from '@n8n/workflow-rules';
import { safeRegex } from 'n8n-workflow';

/** What the engine needs from the instance: its defaults, a time-limited regex and node names. */
@Service()
export class WorkflowRulesContext {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly nodeTypes: NodeTypesProxy,
	) {}

	defaults(): RuleDefaults {
		const { workflows, executions } = this.globalConfig;
		return {
			callerPolicy: workflows.callerPolicyDefaultOption,
			executionTimeout: executions.timeout,
			maxExecutionTimeout: executions.maxTimeout,
		};
	}

	evaluateOptions(exemptedRuleIds: Iterable<string> = []): EvaluateOptions {
		return {
			exemptedRuleIds: [...exemptedRuleIds],
			// Runs each admin pattern in a VM with a time limit, so a slow pattern cannot stall the server.
			regex: safeRegex,
			defaults: this.defaults(),
			getDefaultNodeName: (node) => this.defaultNodeName(node),
		};
	}

	private defaultNodeName(node: RuleNode): string | undefined {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const name = description.defaults.name;
			return typeof name === 'string' ? name : undefined;
		} catch {
			// An unknown or uninstalled node type has no default name to compare with.
			return undefined;
		}
	}
}
