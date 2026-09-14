import type { ConfigEvalArtifact } from './types';

/**
 * Render the config-eval artifact: the eval configs (metrics, dataset ref,
 * node names) + a sample of the referenced dataset. The owning workflow is
 * reference/intent only, so `workflowId` is stripped before rendering —
 * only the config's own evaluation-shaped fields reach the judge prompt.
 */
export function renderConfigEvalArtifact(artifact: ConfigEvalArtifact): string {
	const renderedConfigs = artifact.configs.map(({ workflowId: _workflowId, ...rest }) => rest);

	const lines: string[] = ['## Evaluation configs', ''];
	lines.push('```json', JSON.stringify(renderedConfigs, null, 2), '```', '');

	lines.push('## Dataset (data table)', '');
	if (!artifact.dataTable) {
		lines.push('(no data-table dataset — evaluation configs use a different dataset source)');
		return lines.join('\n');
	}

	lines.push('**Columns:**', '');
	lines.push('```json', JSON.stringify(artifact.dataTable.columns, null, 2), '```', '');
	lines.push('**Sample rows:**', '');
	lines.push('```json', JSON.stringify(artifact.dataTable.rows, null, 2), '```');

	return lines.join('\n');
}
