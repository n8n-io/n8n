// ---------------------------------------------------------------------------
// Config-eval artifact handler — static (no mock-execution scenarios).
// Captures the workflow's evaluation configs plus a sample of the referenced
// data-table dataset. The owning workflow itself is reference/intent only and
// is never fetched/rendered as part of this artifact.
// ---------------------------------------------------------------------------

import { renderConfigEvalArtifact } from './render-config-eval';
import type { ArtifactHandler, ConfigEvalArtifact } from './types';

export const configEvalHandler: ArtifactHandler<ConfigEvalArtifact> = {
	type: 'config-eval',
	runsExecutionScenarios: false,
	discover(ctx) {
		// Refs are captured from the `eval-config` create tool call; ref.id is the owning
		// workflow id from its args (config-evals are fetched per-workflow).
		return ctx.artifactRefs.filter((ref) => ref.type === 'config-eval');
	},
	async fetch(ref, client) {
		const workflowId = ref.id;
		const configs = await client.getWorkflowEvaluationConfigs(workflowId);
		const dtConfig = configs.find((c) => c.datasetSource === 'data_table');
		let dataTable: ConfigEvalArtifact['dataTable'];
		if (dtConfig && dtConfig.datasetSource === 'data_table') {
			// re-check narrows the discriminated union -- .find() alone doesn't
			const projectId = await client.getPersonalProjectId();
			const dataTableId = dtConfig.datasetRef.dataTableId;
			const [columns, rows] = await Promise.all([
				client.getDataTableColumns(projectId, dataTableId),
				client.getDataTableRows(projectId, dataTableId),
			]);
			dataTable = { columns, rows };
		}
		return { configs, dataTable };
	},
	renderArtifact(artifact) {
		return renderConfigEvalArtifact(artifact);
	},
};
