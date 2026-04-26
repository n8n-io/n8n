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

GROUND-TRUTH OUTPUT COLUMNS (already in the dataset — these hold the EXPECTED values per row):
${outputColumns}

For setOutputs, write the agent's actual output to NEW columns derived from these ground-truth column names — convention: prefix with \`actual_\` (e.g. ground-truth \`expected_output\` → setOutputs writes to \`actual_output\`; ground-truth \`expected_response\` → setOutputs writes to \`actual_response\`). Never overwrite the ground-truth column itself. The Evaluation node auto-adds the new column on first eval run.

The setOutputs node MUST have \`source: 'dataTable'\` and \`dataTableId: { mode: 'id', value: '${input.existingDataTableId ?? '<same as EvaluationTrigger>'}' }\` set explicitly (the node default for older typeVersions is googleSheets — that's a silent failure mode). Use \`typeVersion: 4.8\` for the Evaluation node.

METRICS TO CONFIGURE (on setMetrics):
${metrics}

For each metric, set \`expectedAnswer\` to an expression pulling from the EvaluationTrigger row (e.g. \`={{ $('Eval Trigger').item.json.expected_output }}\`) and \`actualAnswer\` to an expression pulling from the agent's output (e.g. \`={{ $json.output }}\`). Use the explicit name you assign to the EvaluationTrigger node (name it \`"Eval Trigger"\` when creating it, then reference exactly that name everywhere — never use the stock default \`"When fetching a dataset row"\` and never create a separate node for that purpose).

For \`correctness\` and \`helpfulness\` metrics: also wire an \`ai_languageModel\` connection from the workflow's existing LLM model node (the one already feeding the AI agent) to each setMetrics node that uses an AI-judged metric. The LLM is reused — same node, additional outgoing \`ai_languageModel\` connection. Without this, AI-judged metrics fail silently. \`stringSimilarity\`/\`categorization\`/\`toolsUsed\` don't need this.

Apply the topology as described in your instructions:
1. EvaluationTrigger → \`n8n-nodes-base.set\` (the SHAPE BRIDGE) → first processing node. The Set node is REQUIRED — it reshapes the dataset row into the shape the AI agent's existing input expressions expect (e.g. \`chatInput\` for chatTrigger, \`message.text\` for telegramTrigger, \`body.<field>\` for webhook). Inspect the AI agent's parameters in the workflow JSON to find the input expression(s) and configure the Set assignments to make those resolve correctly. NOTE: \`Evaluation(setInputs)\` does NOT reshape data — it only attaches metadata for the eval-results display tab. Use a regular Set node for shape-bridging.
2. After the AI agent: insert \`Evaluation(checkIfEvaluating)\` (no separate IF node — it has two native output slots). Slot 0 (Evaluation) routes to setOutputs → setMetrics. Slot 1 (Normal) preserves the original production path with side-effects.

Report back with a one-line summary when done.`;
}
