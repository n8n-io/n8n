import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';

export interface FormatEvalBuilderTaskInput {
	workflowId: string;
	dataTableId: string | undefined;
	datasetChoice: 'generate' | 'link-existing' | 'later';
	detectedAiNodes: string[];
	suggestedOutputColumns: string[];
	enabledMetrics: InstanceAiEvalMetricProposal[];
}

function formatMetric(m: InstanceAiEvalMetricProposal): string {
	const cannedSuffix = m.cannedMetricKey ? `, canned=${m.cannedMetricKey}` : '';
	const promptSuffix = m.prompt ? `\n  Judge prompt: ${m.prompt}` : '';
	return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}${promptSuffix}`;
}

export function formatEvalBuilderTask(input: FormatEvalBuilderTaskInput): string {
	const datasetLine =
		input.dataTableId !== undefined
			? `The \`evaluationTrigger\` should pull from DataTable id \`${input.dataTableId}\`.`
			: 'Leave the `evaluationTrigger` dataTableId empty — the user will wire it manually later.';

	const outputColumns = input.suggestedOutputColumns.map((c) => `- ${c}`).join('\n');
	const metrics = input.enabledMetrics.map(formatMetric).join('\n\n');

	return `Modify workflow ${input.workflowId} to add evaluation nodes, isolating AI agent inputs/outputs for eval runs without triggering side-effect nodes during evaluation.

DETECTED AI NODES: ${input.detectedAiNodes.join(', ')}

REQUIRED TOPOLOGY:
1. Add a \`n8n-nodes-base.evaluationTrigger\` node that pulls rows from the dataset. Connect it to the same downstream node(s) as the main trigger(s) feed into — so evaluation runs re-use the workflow's input pipeline.
2. For each AI agent identified above, after its main output, insert a \`n8n-nodes-base.evaluation\` node with operation \`checkIfEvaluating\`. Connect its output to an \`n8n-nodes-base.if\` node:
   - IF branch "evaluating": route to a \`n8n-nodes-base.evaluation(setOutputs)\` → \`n8n-nodes-base.evaluation(setMetrics)\` chain that captures the AI agent output and terminates the eval path. side-effect nodes MUST NOT be reached along this branch.
   - IF branch "not evaluating": route to whatever the AI agent was originally connected to (preserve the production path unchanged).
3. Existing connections upstream of the AI agent stay as-is. The main trigger → AI agent path is intact.

DATASET:
${datasetLine}

OUTPUT COLUMNS (for setOutputs):
${outputColumns}
Each column value should reference the AI agent's output JSON via n8n expressions.

METRICS TO CONFIGURE (on setMetrics):
${metrics}

Use the \`nodes\` tool to look up the \`evaluationTrigger\` and \`evaluation\` node schemas if needed. Before finishing, validate the modified workflow runs without errors on a representative row.

ORIGINAL USER REQUEST: (provided via conversationContext from the orchestrator — read it to understand the workflow's purpose and match evaluation semantics to its domain).`;
}
