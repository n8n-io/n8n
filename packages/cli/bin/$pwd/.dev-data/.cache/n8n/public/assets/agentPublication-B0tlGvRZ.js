//#region src/features/agents/utils/agentPublication.ts
/** Followed skills can change without a draft id change. */
function hasAgentUnpublishedChanges(agent) {
	return Boolean(agent?.activeVersionId && (agent.versionId !== agent.activeVersionId || Object.values(agent.skillVersions ?? {}).some(({ draft, published }) => draft !== published)));
}
//#endregion
export { hasAgentUnpublishedChanges as t };
