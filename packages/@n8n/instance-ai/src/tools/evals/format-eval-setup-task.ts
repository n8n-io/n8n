import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';

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

	return `Set up evaluations for workflow "${input.workflowName}" (id: ${input.workflowId}).

AI AGENT NODES IN WORKFLOW: ${input.detectedAiNodes.join(', ')}

DATASET:
${datasetSection}

INPUT COLUMNS (the shape bridge MUST expose every one of these via \`={{ $json.<column> }}\` — even when the target agent uses a passthrough like \`$input.all()\` or its prompt looks hardcoded; the agent's connected sub-nodes / tools may read these columns at runtime, so include a passthrough assignment per input column even when in doubt):
${inputColumns}

HARD RULE — DO NOT MODIFY TARGET AI AGENT PARAMETERS. Leave the target agent's \`text\`, \`promptType\`, \`options\`, \`systemMessage\`, tools, and every other field untouched. The shape bridge is the ONLY place where you adapt data; never rewrite the agent's prompt to match the dataset shape. If you cannot reshape the data via the Set node alone, stop and report — do not edit the agent.

GROUND-TRUTH OUTPUT COLUMNS (already in the dataset — these hold the EXPECTED values per row):
${outputColumns}

For setOutputs, write the agent's actual output to NEW columns derived from these ground-truth column names — convention: prefix with \`actual_\` (e.g. ground-truth \`expected_output\` → setOutputs writes to \`actual_output\`; ground-truth \`expected_response\` → setOutputs writes to \`actual_response\`). Never overwrite the ground-truth column itself. The Evaluation node auto-adds the new column on first eval run.

The setOutputs node MUST have \`source: 'dataTable'\` and \`dataTableId: { mode: 'id', value: '${setOutputsDataTableId}' }\` set explicitly (the node default for older typeVersions is googleSheets — that's a silent failure mode). Use \`typeVersion: 4.8\` for the Evaluation node.

METRICS TO CONFIGURE (on setMetrics):
${metrics}

For each metric, set \`expectedAnswer\` to an expression pulling from the EvaluationTrigger row (e.g. \`={{ $('Eval Trigger').item.json.expected_output }}\`) and \`actualAnswer\` to an expression pulling from the agent's output (e.g. \`={{ $json.output }}\`). Use the explicit name you assign to the EvaluationTrigger node (name it \`"Eval Trigger"\` when creating it, then reference exactly that name everywhere — never use the stock default \`"When fetching a dataset row"\` and never create a separate node for that purpose).

For \`correctness\` and \`helpfulness\` metrics: also wire an \`ai_languageModel\` connection from the workflow's existing LLM model node (the one already feeding the AI agent) to each setMetrics node that uses an AI-judged metric. The LLM is reused — same node, additional outgoing \`ai_languageModel\` connection. Without this, AI-judged metrics fail silently. \`stringSimilarity\`/\`categorization\`/\`toolsUsed\` don't need this.

Do not modify existing production node parameters, and do not rewrite the AI Agent prompt or input expressions to make evals work. If the AI Agent currently reads another node directly, leave it unchanged and report that this target cannot be made standalone with topology-only eval setup.

Apply the topology as described in your instructions:
1. EvaluationTrigger → \`n8n-nodes-base.set\` (the SHAPE BRIDGE) → target AI agent node. The Set node is REQUIRED — it reshapes the dataset row into the shape the AI agent's existing input expressions expect (e.g. \`chatInput\` for chatTrigger, \`message.text\` for telegramTrigger, \`body.<field>\` for webhook). Inspect the AI agent's parameters in the workflow JSON to find the input expression(s) and configure the Set assignments to make those resolve correctly. Shape bridge assignment values must read only the current EvaluationTrigger row via \`$json.<input_column>\`, plus constants or constructed objects. Never reference original workflow nodes in shape bridge assignments: no \`$('Some Node').item.json\`, \`$('Some Node').first().json\`, \`$node[\`, \`$input.item\`, trigger, Wait/Delay, or preprocessing node JSON. Do not route eval input through the main trigger path, Wait/Delay nodes, or other intermediate processing nodes; recreate the required input shape in the Set node and connect it directly to the target AI agent. NOTE: \`Evaluation(setInputs)\` does NOT reshape data — it only attaches metadata for the eval-results display tab. Use a regular Set node for shape-bridging.
2. After the AI agent: insert \`Evaluation(checkIfEvaluating)\` (no separate IF node — it has two native output slots). Slot 0 (Evaluation) routes to setOutputs → setMetrics. Slot 1 (Normal) preserves the original production path with side-effects.

Report back with a one-line summary when done.`;
}
