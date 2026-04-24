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
	if (input.datasetChoice === 'generate') {
		// Defensive fallback — the orchestrator normally pre-creates the DataTable
		// and passes 'link-existing'. If something upstream bypassed that, instruct
		// the sub-agent to leave dataTableId empty rather than trying to create.
		return `Do not create a DataTable yourself. Leave the EvaluationTrigger's dataTableId empty — the upstream orchestrator will handle dataset population.`;
	}
	if (input.datasetChoice === 'link-existing') {
		return `Wire the EvaluationTrigger to DataTable id \`${input.existingDataTableId}\`. This table is already created and populated with sample rows — do not modify its rows or schema.`;
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

Apply the checkIfEvaluating topology as described in your instructions (no separate IF node — checkIfEvaluating has native split outputs). Preserve the workflow's production path (side-effects remain wired to the Normal slot).

Report back with a one-line summary when done.`;
}
