import { OperationalError } from 'n8n-workflow';

import type { Agent } from '../entities/agent.entity';

/** Published snapshots to the agent_history version they came from. */
const publishedSnapshotVersions = new WeakMap<object, string>();

/**
 * The agent as published. Skill bodies are not copied here: the runtime reads the
 * versions pinned to this agent_history row (see `publishedSnapshotVersionOf`).
 */
export function getPublishedAgentSnapshot(agentEntity: Agent): Agent {
	const activeVersion = agentEntity.activeVersion;
	const activeVersionSchema = activeVersion?.schema;
	if (!activeVersion || !activeVersionSchema) {
		throw new OperationalError(
			'Agent is not published. Publish the agent before using it in a workflow.',
		);
	}

	const snapshot = {
		...agentEntity,
		schema: activeVersionSchema,
		tools: activeVersion.tools ?? {},
		skills: {},
	} as Agent;
	publishedSnapshotVersions.set(snapshot, activeVersion.versionId);
	return snapshot;
}

/** The published version a snapshot came from, or undefined for a draft entity. */
export function publishedSnapshotVersionOf(agent: object): string | undefined {
	return publishedSnapshotVersions.get(agent);
}
