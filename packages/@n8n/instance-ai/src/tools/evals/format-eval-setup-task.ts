import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';

import type { NamedRef } from './detect-agent-named-refs.service';

export interface FormatEvalSetupTaskInput {
	workflowId: string;
	workflowName: string;
	detectedAiNodes: string[];
	datasetChoice: 'create-empty' | 'link-existing' | 'later';
	existingDataTableId?: string;
	projectId?: string;
	suggestedInputColumns: string[];
	suggestedOutputColumns: string[];
	enabledMetrics: InstanceAiEvalMetricProposal[];
	namedRefs?: NamedRef[];
}

function formatProductionAdapter(namedRefs: NamedRef[]): string {
	if (namedRefs.length === 0) return '';

	const sources = [...new Set(namedRefs.map((r) => r.nodeName))].map((n) => `\`${n}\``).join(', ');
	const nodeOrNodes = namedRefs.length === 1 ? 'node' : 'nodes';
	const assignments = namedRefs
		.map(
			(r) => `  - { name: "${r.column}", value: "={{ ${r.originalExpression} }}", type: "string" }`,
		)
		.join('\n');
	const rewrites = namedRefs
		.map(
			(r) =>
				`  - Column \`${r.column}\`: replace \`${r.originalExpression}\` with \`$json.${r.column}\` everywhere it appears in the agent's parameters.`,
		)
		.join('\n');

	return `
PRODUCTION ADAPTER (REQUIRED — the agent currently reads input from named ${nodeOrNodes} ${sources}, which won't resolve in eval runs):

1. Insert a new \`n8n-nodes-base.set\` node named \`"Eval Production Adapter"\` (\`typeVersion: 3.4\`) immediately upstream of the agent on the PRODUCTION path. The agent's existing \`main\` input parent on the production path becomes the Set adapter's \`main\` input parent. The Set adapter's \`main\` output goes to the agent.
2. Configure the Set adapter's \`assignments.assignments\` array with these entries (one per named-ref source):
${assignments}
3. Rewrite the agent's parameters:
${rewrites}
4. The eval branch wires \`EvaluationTrigger\` directly to the agent's \`main\` input as a SECOND incoming connection (no Set adapter between them — the trigger row already has \`$json.<column>\` shape).

After your edits the agent has TWO incoming \`main\` connections: one from the Eval Production Adapter (production runs) and one from the EvaluationTrigger (eval runs). Both produce \`$json.<column>\` so the rewritten agent parameters resolve in both modes.`;
}

function formatMetric(m: InstanceAiEvalMetricProposal): string {
	const cannedSuffix = m.cannedMetricKey ? `, canned=${m.cannedMetricKey}` : '';
	const promptSuffix = m.prompt ? `\n  Judge prompt: ${m.prompt}` : '';
	return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}${promptSuffix}`;
}

function formatDatasetSection(input: FormatEvalSetupTaskInput): string {
	if (input.datasetChoice === 'link-existing') {
		return `Wire the EvaluationTrigger to DataTable id \`${input.existingDataTableId}\`. This table already exists — do not modify its rows or schema.`;
	}
	if (input.datasetChoice === 'later') {
		return "Do not create a DataTable. Leave the EvaluationTrigger's dataTableId empty — the user will wire it manually later.";
	}

	const tableName = `${input.workflowName} eval dataset`;
	const columns = [...input.suggestedInputColumns, ...input.suggestedOutputColumns]
		.map((c) => `- ${c}`)
		.join('\n');
	return `Create an empty DataTable named "${tableName}"${input.projectId ? ` in project id \`${input.projectId}\`` : ''} using only the \`create-empty-eval-data-table\` tool. Columns to create as strings:\n${columns}\n\nDo not insert rows, generate rows, or mutate row data. After creating the empty table, wire the EvaluationTrigger and setOutputs dataTableId to the created table id.`;
}

export function formatEvalSetupTask(input: FormatEvalSetupTaskInput): string {
	const outputColumns = input.suggestedOutputColumns.map((c) => `- ${c}`).join('\n');
	const inputColumns = input.suggestedInputColumns.map((c) => `- ${c}`).join('\n');
	const metrics = input.enabledMetrics.map(formatMetric).join('\n\n');
	const datasetSection = formatDatasetSection(input);
	const setOutputsDataTableId = input.existingDataTableId ?? '<same as EvaluationTrigger>';
	const adapterSection = formatProductionAdapter(input.namedRefs ?? []);

	return `Set up evaluations for workflow "${input.workflowName}" (id: ${input.workflowId}).

AI AGENT NODES IN WORKFLOW: ${input.detectedAiNodes.join(', ')}

DATASET:
${datasetSection}

INPUT COLUMNS (the AI agent's parameters MUST reference each of these via \`={{ $json.<column> }}\`. If the agent's existing parameters reference different fields, rewrite those parameter expressions to use these dataset columns. Only rewrite input-reading parameters — leave credentials, tools, model selection, and unrelated configuration untouched):
${inputColumns}
${adapterSection}

GROUND-TRUTH OUTPUT COLUMNS (already in the dataset — these hold the EXPECTED values per row):
${outputColumns}

For setOutputs, write the agent's actual output to NEW columns derived from these ground-truth column names — convention: prefix with \`actual_\` (e.g. ground-truth \`expected_output\` → setOutputs writes to \`actual_output\`; ground-truth \`expected_response\` → setOutputs writes to \`actual_response\`). Never overwrite the ground-truth column itself. The Evaluation node auto-adds the new column on first eval run.

The setOutputs node MUST have \`source: 'dataTable'\` and \`dataTableId: { mode: 'id', value: '${setOutputsDataTableId}' }\` set explicitly (the node default for older typeVersions is googleSheets — that's a silent failure mode). Use \`typeVersion: 4.8\` for the Evaluation node.

METRICS TO CONFIGURE (on setMetrics):
${metrics}

For each metric, set \`expectedAnswer\` to an expression pulling from the EvaluationTrigger row (e.g. \`={{ $('Eval Trigger').item.json.expected_output }}\`) and \`actualAnswer\` to an expression pulling from the agent's output (e.g. \`={{ $json.output }}\`). Use the explicit name you assign to the EvaluationTrigger node (name it \`"Eval Trigger"\` when creating it, then reference exactly that name everywhere — never use the stock default \`"When fetching a dataset row"\` and never create a separate node for that purpose).

For \`correctness\` and \`helpfulness\` metrics: also wire an \`ai_languageModel\` connection from the workflow's existing LLM model node (the one already feeding the AI agent) to each setMetrics node that uses an AI-judged metric. The LLM is reused — same node, additional outgoing \`ai_languageModel\` connection. Without this, AI-judged metrics fail silently. \`stringSimilarity\`/\`categorization\`/\`toolsUsed\` don't need this.

Apply the topology as described in your instructions:
1. EvaluationTrigger → target AI agent node (direct \`main\` connection). No intermediate Set/Code/transform node. The trigger emits each dataset column as \`$json.<column>\`. If the agent's existing parameters reference fields that don't match the listed INPUT COLUMNS, rewrite those parameter expressions to use \`{{ $json.<column> }}\`. NOTE: \`Evaluation(setInputs)\` does NOT reshape data — it only attaches metadata for the eval-results display tab.
2. After the AI agent: insert \`Evaluation(checkIfEvaluating)\` (no separate IF node — it has two native output slots). Slot 0 (Evaluation) routes to setOutputs → setMetrics. Slot 1 (Normal) preserves the original production path with side-effects.

Report back with a one-line summary when done.`;
}
