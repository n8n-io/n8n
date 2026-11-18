import type { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { Agent } from '../entities/agent.entity';

/**
 * Whether the draft of a published agent equals its published version. The
 * skill versions that the draft follows are part of the comparison.
 */
export async function isAgentDraftClean(
	agent: Pick<Agent, 'id' | 'schema' | 'versionId' | 'activeVersionId'> & object,
	skillRefs: AgentSkillRefsService,
): Promise<boolean> {
	return (
		agent.activeVersionId !== null &&
		agent.versionId === agent.activeVersionId &&
		(await skillRefs.matchesVersion(
			agent.activeVersionId,
			await skillRefs.versionSnapshot(agent, {}),
			{},
		))
	);
}
