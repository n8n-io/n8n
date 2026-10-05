import type { AgentJsonConfig } from '@n8n/api-types';
import { v5 as uuidv5 } from 'uuid';

import {
	AGENT_CONFIG_ID_KEYS,
	extractAgentCredentialIds,
	visitAgentCredentialIds,
} from '@/modules/agents/utils/extract-agent-credential-ids';
import { extractAgentWorkflowRefs } from '@/modules/agents/utils/extract-agent-workflow-refs';

import type { AgentPlanItem, PreparedAgent } from './agent-import.types';
import type { ImportBindingMap, PackageImportBindings } from '../../n8n-packages.types';
import type { PackageCredentialRequirement } from '../../spec/requirements.schema';
import { addRequirementUsage } from '../requirement-source';
import {
	getStaticSubworkflowId,
	setStaticSubworkflowId,
} from '../workflow/references/sub-workflow-node.reference';

export function agentWorkflowIds(config: AgentJsonConfig | null): string[] {
	const ids = new Set(
		extractAgentWorkflowRefs(config).map((ref) => ref.workflowId ?? ref.workflow),
	);
	for (const tool of config?.tools ?? []) {
		if (tool.type !== 'node') continue;
		const id = getStaticSubworkflowId({
			type: tool.node.nodeType,
			parameters: tool.node.nodeParameters,
		});
		if (id) ids.add(id);
	}
	return [...ids];
}

export function agentTaskBindings(agent: PreparedAgent, targetId: string): ImportBindingMap {
	return new Map(
		agent.definition.tasks.map(({ id }) => [
			id,
			// New agent IDs need new global task IDs. Keep them stable on repeated imports.
			targetId === agent.sourceAgentId
				? id
				: uuidv5(JSON.stringify([targetId, id]), uuidv5.URL).replaceAll('-', ''),
		]),
	);
}

export function applyAgentBindings(item: AgentPlanItem, bindings: PackageImportBindings) {
	const definition = structuredClone(item.definition);
	definition.tasks = definition.tasks.map((task) => ({
		...task,
		id: item.taskBindings.get(task.id)!,
	}));
	const config = definition.config;
	if (!config) return definition;
	const replaceCredential = (id: string, replace: (id: string) => void) => {
		const target = bindings.credentials.get(id);
		if (target) replace(target);
	};
	visitAgentCredentialIds(config, replaceCredential, AGENT_CONFIG_ID_KEYS);
	visitAgentCredentialIds(config.integrations, replaceCredential);
	for (const ref of extractAgentWorkflowRefs(config)) {
		const target = bindings.workflows.get(ref.workflowId ?? ref.workflow);
		if (target) {
			ref.workflowId = target;
			ref.workflow = target;
		}
	}
	for (const tool of config.tools ?? []) {
		if (tool.type !== 'node') continue;
		const node = { type: tool.node.nodeType, parameters: tool.node.nodeParameters };
		const id = getStaticSubworkflowId(node);
		const target = id && bindings.workflows.get(id);
		if (target) setStaticSubworkflowId(node, target);
	}
	for (const ref of config.subAgents?.agents ?? []) {
		ref.agentId = bindings.agents.get(ref.agentId) ?? ref.agentId;
	}
	for (const ref of config.tasks ?? []) ref.id = item.taskBindings.get(ref.id)!;
	return definition;
}

export function collectPlannedAgentBindings(
	plans: Array<{ items: AgentPlanItem[] }>,
): ImportBindingMap {
	return new Map(
		plans.flatMap(({ items }) => items.map((item) => [item.sourceAgentId, item.targetId] as const)),
	);
}

/** Resolve credentials even if a package omits their manifest requirements. */
export function includeAgentCredentialRequirements(
	requirements: PackageCredentialRequirement[] | undefined,
	agents: PreparedAgent[],
	projectId: string,
): PackageCredentialRequirement[] | undefined {
	if (agents.length === 0) return requirements;
	const byId = new Map(
		structuredClone(requirements ?? []).map((requirement) => [requirement.id, requirement]),
	);
	for (const { sourceAgentId, definition } of agents) {
		const ids = new Set([
			...extractAgentCredentialIds(definition.config, AGENT_CONFIG_ID_KEYS),
			...extractAgentCredentialIds(definition.config?.integrations),
		]);
		for (const id of ids) {
			const requirement = byId.get(id) ?? { id, usedByWorkflows: [] };
			addRequirementUsage(requirement, { agentId: sourceAgentId, projectId });
			byId.set(id, requirement);
		}
	}
	return [...byId.values()];
}
