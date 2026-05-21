import { v4 as uuid } from 'uuid';

import type { Agent } from '../entities/agent.entity';

/**
 * Start a new draft if the agent is currently in sync with the published snapshot.
 * Any mutation that changes how the agent would run must call this so that
 * `hasUnpublishedChanges` stays accurate.
 */
export function markAgentDraftDirty(agent: Agent): void {
	if (
		agent.versionId !== null &&
		agent.versionId === agent.publishedVersion?.publishedFromVersionId
	) {
		agent.versionId = uuid();
	}
}
