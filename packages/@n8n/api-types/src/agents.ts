/**
 * The snapshot of an agent at publish time. Returned by publish/unpublish
 * endpoints as part of the agent payload so the UI can derive publish state
 * (`not-published` / `published-no-changes` / `published-with-changes`) from
 * `agent.versionId` vs `publishedVersion.publishedFromVersionId`.
 */
export interface AgentPublishedVersionDto {
	schema: unknown;
	publishedFromVersionId: string;
	model: string | null;
	provider: string | null;
	credentialId: string | null;
	publishedById: string | null;
}
