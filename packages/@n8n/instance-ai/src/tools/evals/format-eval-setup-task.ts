import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';

export interface FormatEvalSetupTaskInput {
	workflowId: string;
	workflowName: string;
	detectedAiNodes: string[];
	datasetChoice: 'generate' | 'link-existing' | 'later';
	existingDataTableId?: string;
	projectId?: string;
	suggestedInputColumns: string[];
	suggestedOutputColumns: string[];
	enabledMetrics: InstanceAiEvalMetricProposal[];
}

function formatMetric(m: InstanceAiEvalMetricProposal): string {
	const cannedSuffix = m.cannedMetricKey ? `, canned=${m.cannedMetricKey}` : '';
	const promptSuffix = m.prompt ? `\n  Judge prompt: ${m.prompt}` : '';
	return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}${promptSuffix}`;
}

function formatDatasetSection(input: FormatEvalSetupTaskInput): string {
	const columns = [...input.suggestedInputColumns, ...input.suggestedOutputColumns];
	if (input.datasetChoice === 'generate') {
		const projectPart = input.projectId
			? `in project ${input.projectId}`
			: 'in the current project';
		return `Create a new DataTable named "${input.workflowName} — eval samples" ${projectPart}.
Columns: ${columns.join(', ')} (all string).
Generate 5-7 realistic sample rows following the dataset design principles in your instructions.`;
	}
	if (input.datasetChoice === 'link-existing') {
		return `Use existing DataTable id: ${input.existingDataTableId}. Do not create a new one.
Wire the EvaluationTrigger to this DataTable id.`;
	}
	return `Do not create a DataTable. Leave the EvaluationTrigger's dataTableId empty — the user will wire it manually later.`;
}

export function formatEvalSetupTask(input: FormatEvalSetupTaskInput): string {
	const outputColumns = input.suggestedOutputColumns.map((c) => `- ${c}`).join('\n');
	const metrics = input.enabledMetrics.map(formatMetric).join('\n\n');
	const datasetSection = formatDatasetSection(input);

	return `Set up evaluations for workflow "${input.workflowName}" (id: ${input.workflowId}).

AI AGENT NODES IN WORKFLOW: ${input.detectedAiNodes.join(', ')}

DATASET:
${datasetSection}

OUTPUT COLUMNS (for setOutputs):
${outputColumns}

METRICS TO CONFIGURE (on setMetrics):
${metrics}

Apply the checkIfEvaluating + IF topology as described in your instructions. Preserve the workflow's production path (side-effects remain wired to the "not evaluating" branch).

Report back with a one-line summary when done.`;
}
