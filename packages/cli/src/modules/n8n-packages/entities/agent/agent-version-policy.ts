import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';

import type { Agent } from '@/modules/agents/entities/agent.entity';

import { WorkflowVersionPolicy } from '../../n8n-packages.types';
import { PackageExportBlockedError } from '../package-export.errors';

export type AgentExportSource = Pick<
	Agent,
	| 'id'
	| 'name'
	| 'projectId'
	| 'schema'
	| 'integrations'
	| 'tools'
	| 'skills'
	| 'availableInMCP'
	| 'versionId'
	| 'activeVersionId'
> & { taskVersionId?: string };

export function applyAgentVersionPolicy(
	agents: Agent[],
	policy: WorkflowVersionPolicy,
): AgentExportSource[] {
	if (policy === WorkflowVersionPolicy.Latest) return agents;
	if (policy === WorkflowVersionPolicy.PublishedStrict) {
		const unpublished = agents.filter((agent) => !agent.activeVersionId);
		if (unpublished.length > 0) {
			throw new PackageExportBlockedError(
				`${unpublished.length} agent(s) have no published version. Export aborted.`,
				{
					description: `Unpublished agent IDs: ${unpublished
						.slice(0, 20)
						.map(({ id }) => id)
						.join(', ')}`,
				},
			);
		}
	}
	const selected =
		policy === WorkflowVersionPolicy.IgnoreUnpublished
			? agents.filter((agent) => agent.activeVersionId !== null)
			: agents;
	return selected.map((agent) => {
		if (!agent.activeVersionId) return agent;
		const version = agent.activeVersion;
		if (!version)
			throw new UnexpectedError('Published version was not loaded for agent', {
				extra: { agentId: agent.id },
			});
		return {
			...agent,
			schema: version.schema,
			tools: version.tools ?? {},
			skills: version.skills ?? {},
			versionId: version.versionId,
			taskVersionId: version.versionId,
			integrations: [
				...(agent.integrations ?? []).filter(({ type }) => type !== N8N_CHAT_INTEGRATION_TYPE),
				...(version.schema?.integrations ?? []).filter(
					({ type }) => type === N8N_CHAT_INTEGRATION_TYPE,
				),
			],
		};
	});
}
