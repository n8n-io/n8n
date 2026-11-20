/**
 * Selects the index rows of the version that runs: the published rows of an active workflow,
 * and the draft rows of an inactive one. Each workflow then appears in one version only.
 */
export const runningVersionRows = (dependencyAlias: string, workflowAlias: string) =>
	`((${workflowAlias}.activeVersionId IS NULL AND ${dependencyAlias}.publishedVersionId IS NULL) OR ${dependencyAlias}.publishedVersionId = ${workflowAlias}.activeVersionId)`;
