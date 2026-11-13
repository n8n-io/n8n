import type { AgentSkillVersionInfo } from '@n8n/api-types';
import type { AgentResource } from '../types';

/** Followed skills can change without a draft id change. */
export function hasAgentUnpublishedChanges(
	agent:
		| (Pick<AgentResource, 'versionId' | 'activeVersionId'> & {
				skillVersions?: Record<string, AgentSkillVersionInfo>;
		  })
		| null,
): boolean {
	return Boolean(
		agent?.activeVersionId &&
			(agent.versionId !== agent.activeVersionId ||
				Object.values(agent.skillVersions ?? {}).some(
					({ draft, published }) => draft !== published,
				)),
	);
}
