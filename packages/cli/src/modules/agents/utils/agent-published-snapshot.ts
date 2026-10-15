import type { AgentSkill } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import { OperationalError } from 'n8n-workflow';

import type { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import type { AgentSkillRefs } from '../json-config/agent-document';

/** The agent content that a run uses: the draft or the published version. */
export interface AgentRunSource {
	/** The agent draft, or the agent with the content of its published version. */
	agent: Agent;
	skillRefs: AgentSkillRefs;
	/** Skill bodies from the skills hub, keyed by skill id: the draft's or the pinned ones. */
	skills: Record<string, AgentSkill>;
}

function getPublishedVersion(agentEntity: Agent): AgentHistory {
	const activeVersion = agentEntity.activeVersion;
	if (!activeVersion?.schema) {
		throw new OperationalError(
			'Agent is not published. Publish the agent before using it in a workflow.',
		);
	}
	return activeVersion;
}

function getPublishedAgentSnapshot(agentEntity: Agent): Agent {
	const activeVersion = getPublishedVersion(agentEntity);
	return {
		...agentEntity,
		schema: activeVersion.schema,
		tools: activeVersion.tools ?? {},
	} as Agent;
}

/**
 * Select the draft or the published version of an agent for a run, with the
 * skill refs of the same draft or version.
 */
export async function resolveAgentRunSource(
	agentEntity: Agent,
	usePublishedVersion: boolean,
	agentSkillRefs: AgentSkillRefsService,
	ctx: OperationContext,
): Promise<AgentRunSource> {
	if (!usePublishedVersion) {
		return { agent: agentEntity, ...(await agentSkillRefs.readDraft(agentEntity, ctx)) };
	}
	const activeVersion = getPublishedVersion(agentEntity);
	return {
		agent: getPublishedAgentSnapshot(agentEntity),
		...(await agentSkillRefs.readVersion(activeVersion, ctx)),
	};
}
