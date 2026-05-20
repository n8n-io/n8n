import type { DirectJsonRef } from './analyze-agent-input-columns.service';
import {
	currentJsonPathExpression,
	currentJsonExpression,
	jsonFieldAccessor,
	nodeItemJsonExpression,
} from './column-ref-utils';
import type { NamedRef } from './detect-agent-named-refs.service';
import {
	formatEvalDataTableColumnName,
	formatEvalDataTableColumnNameMap,
	formatEvalDataTableName,
} from './ensure-eval-data-table.service';
import type { MetricProposal } from './metric-catalog';

export interface FormatEvalSetupTaskInput {
	workflowId: string;
	workflowName: string;
	detectedAiNodes: string[];
	datasetChoice: 'create-empty' | 'link-existing' | 'later';
	existingDataTableId?: string;
	projectId?: string;
	suggestedInputColumns: string[];
	suggestedOutputColumns: string[];
	enabledMetrics: MetricProposal[];
	directRefs?: DirectJsonRef[];
	namedRefs?: NamedRef[];
	targetAgentNodeName?: string;
}

function taskString(value: string): string {
	return JSON.stringify(value) ?? '""';
}

function evalTriggerJsonRef(column: string): string {
	return `={{ $('Eval Trigger').item.json${jsonFieldAccessor(column)} }}`;
}

type AdapterAssignment = {
	column: string;
	valueExpression: string;
};

type AdapterRewrite = {
	targetNodeName: string;
	originalExpression: string;
	column: string;
};

function formatProductionAdapter(
	directRefs: DirectJsonRef[],
	namedRefs: NamedRef[],
	columnNameFor: (column: string) => string,
): string {
	const directRefsNeedingAdapter = directRefs.filter(
		(ref) => columnNameFor(ref.column) !== ref.field,
	);
	if (namedRefs.length === 0 && directRefsNeedingAdapter.length === 0) return '';

	// Set adapter assignments: one per unique column, using canonical single-quote syntax.
	const assignmentsByColumn = new Map<string, AdapterAssignment>();
	for (const r of directRefsNeedingAdapter) {
		const column = columnNameFor(r.column);
		if (!assignmentsByColumn.has(column)) {
			assignmentsByColumn.set(column, {
				column,
				valueExpression: currentJsonPathExpression(r.path),
			});
		}
	}
	for (const r of namedRefs) {
		const column = columnNameFor(r.column);
		if (!assignmentsByColumn.has(column)) {
			assignmentsByColumn.set(column, {
				column,
				valueExpression: nodeItemJsonExpression(r.nodeName, r.path),
			});
		}
	}
	const assignments = [...assignmentsByColumn.values()]
		.map(
			(a) =>
				`  - { name: ${taskString(a.column)}, value: ${taskString(`={{ ${a.valueExpression} }}`)}, type: "string" }`,
		)
		.join('\n');

	// Rewrites grouped by target node.
	//
	// All targets use the same replacement form. The Set adapter and the
	// EvaluationTrigger both feed the agent row shape into the agent; AI
	// sub-components resolve `$json` against that parent input too. Referencing
	// the agent by name from a sub-component is invalid because the agent is not
	// a previous node when the sub-component parameters are evaluated.
	const rewritesToApply: AdapterRewrite[] = [
		...directRefsNeedingAdapter.map((r) => ({
			targetNodeName: r.targetNodeName,
			originalExpression: r.originalExpression,
			column: r.column,
		})),
		...namedRefs.map((r) => ({
			targetNodeName: r.targetNodeName,
			originalExpression: r.originalExpression,
			column: r.column,
		})),
	];
	const byTarget = new Map<string, AdapterRewrite[]>();
	for (const r of rewritesToApply) {
		const arr = byTarget.get(r.targetNodeName) ?? [];
		arr.push(r);
		byTarget.set(r.targetNodeName, arr);
	}
	const rewriteBlocks: string[] = [];
	for (const [target, refs] of byTarget) {
		const lines = refs
			.map((r) => {
				const column = columnNameFor(r.column);
				const replacement = `{{ ${currentJsonExpression(column)} }}`;
				return `    - Replace \`${r.originalExpression}\` with \`${replacement}\``;
			})
			.join('\n');
		rewriteBlocks.push(`  In \`${target}\`:\n${lines}`);
	}
	const rewrites = rewriteBlocks.join('\n');

	const sourceList = [...new Set(namedRefs.map((r) => r.nodeName))]
		.map((n) => `\`${n}\``)
		.join(', ');
	const namedSourceText =
		sourceList.length > 0 ? `named nodes ${sourceList}` : 'the production input JSON';

	return `
PRODUCTION ADAPTER (REQUIRED — the agent and/or its connected sub-components currently read input from ${namedSourceText} or nested fields that won't resolve from flat test-case table columns):

1. Insert a new \`n8n-nodes-base.set\` node named \`"Eval Production Adapter"\` (\`typeVersion: 3.4\`) immediately upstream of the agent on the PRODUCTION path. The agent's existing \`main\` input parent on the production path becomes the Set adapter's \`main\` input parent. The Set adapter's \`main\` output goes to the agent.
2. Configure the Set adapter's \`assignments.assignments\` array (one entry per unique dataset column):
${assignments}
3. Rewrite parameter expressions in each affected node — the agent and any sub-components (memory, tools, output parsers) listed below. Use the exact \`{{ $json.<column> }}\` replacement listed below for every target node.
${rewrites}
4. The eval branch wires \`EvaluationTrigger\` directly to the agent's \`main\` input as a SECOND incoming connection (no Set adapter between them — the trigger row already has \`$json.<column>\` shape).

After your edits the agent has TWO incoming \`main\` connections: one from the Eval Production Adapter (production runs) and one from the EvaluationTrigger (eval runs). Both produce \`$json.<column>\` for the agent and its sub-components.`;
}

function formatMetric(
	m: MetricProposal,
	input: FormatEvalSetupTaskInput,
	columnNameFor: (column: string) => string,
): string {
	const cannedSuffix = m.cannedMetricKey ? `, canned=${m.cannedMetricKey}` : '';
	const promptSuffix = m.prompt ? `\n  Prompt: ${m.prompt}` : '';
	const expectedOutputColumn = input.suggestedOutputColumns[0]
		? columnNameFor(input.suggestedOutputColumns[0])
		: 'expected_output';
	const expectedToolsColumn =
		input.suggestedOutputColumns
			.map((column) => columnNameFor(column))
			.find((column) => column === 'expected_tools') ?? 'expected_tools';
	const inputColumn = input.suggestedInputColumns[0]
		? columnNameFor(input.suggestedInputColumns[0])
		: 'input';

	switch (m.cannedMetricKey) {
		case 'correctness':
			return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}
  Configure Evaluation(setMetrics) with \`metric: 'correctness'\`, \`expectedAnswer: ${evalTriggerJsonRef(expectedOutputColumn)}\`, \`actualAnswer: ={{ $json.output }}\`, and \`options.metricName: '${m.name}'\`. Connect an \`ai_languageModel\` input.${promptSuffix}`;
		case 'helpfulness':
			return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}
  Configure Evaluation(setMetrics) with \`metric: 'helpfulness'\`, \`userQuery: ${evalTriggerJsonRef(inputColumn)}\`, \`actualAnswer: ={{ $json.output }}\`, and \`options.metricName: '${m.name}'\`. Connect an \`ai_languageModel\` input.${promptSuffix}`;
		case 'tool_use':
			return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}
  Configure Evaluation(setMetrics) with \`metric: 'toolsUsed'\` (not \`'tool_use'\`), \`expectedTools: ${evalTriggerJsonRef(expectedToolsColumn)}\`, \`intermediateSteps: ={{ $json.intermediateSteps }}\`, and \`options.metricName: '${m.name}'\`. Enable returning intermediate steps on the agent.`;
		case 'relevance':
			return `- ${m.name} (${m.kind}${cannedSuffix}): ${m.description}
  There is no native \`relevance\` metric option. Configure Evaluation(setMetrics) with \`metric: 'helpfulness'\`, \`userQuery: ${evalTriggerJsonRef(inputColumn)}\`, \`actualAnswer\` mapped to the retrieved context or response field being judged, \`options.metricName: '${m.name}'\`, and the relevance prompt below. Connect an \`ai_languageModel\` input.${promptSuffix}`;
		default:
			return `- ${m.name} (${m.kind}): ${m.description}${promptSuffix}`;
	}
}

function formatDatasetSection(input: FormatEvalSetupTaskInput, dataTableColumns: string[]): string {
	if (input.datasetChoice === 'link-existing') {
		return `Wire the EvaluationTrigger to DataTable id \`${input.existingDataTableId}\`. This table already exists — do not modify its rows or schema.`;
	}
	if (input.datasetChoice === 'later') {
		return "Do not create a DataTable. Leave the EvaluationTrigger's dataTableId empty — the user will wire it manually later.";
	}

	const tableName = formatEvalDataTableName(input.workflowName);
	const columns = dataTableColumns.map((c) => `- ${c}`).join('\n');
	return `Create an empty DataTable named "${tableName}"${input.projectId ? ` in project id \`${input.projectId}\`` : ''} using only the \`create-empty-eval-data-table\` tool. Columns to create as strings:\n${columns}\n\nDo not insert rows, generate rows, or mutate row data. After creating the empty table, wire the EvaluationTrigger and setOutputs dataTableId to the created table id.`;
}

function formatSetOutputsDataTableInstruction(input: FormatEvalSetupTaskInput): string {
	if (input.datasetChoice === 'link-existing') {
		const id = input.existingDataTableId ?? '<existing DataTable id>';
		return `The setOutputs node MUST have \`source: 'dataTable'\` and \`dataTableId: { mode: 'id', value: '${id}' }\` set explicitly (the node default for older typeVersions is googleSheets — that's a silent failure mode).`;
	}
	if (input.datasetChoice === 'later') {
		return 'Leave setOutputs dataTableId empty until the user selects a DataTable. Do not write placeholder values into EvaluationTrigger or setOutputs.';
	}
	return "The setOutputs node MUST have `source: 'dataTable'` and `dataTableId` set explicitly using the id returned by `create-empty-eval-data-table` (the same id wired on the EvaluationTrigger). The node default for older typeVersions is googleSheets — that's a silent failure mode.";
}

export function formatEvalSetupTask(input: FormatEvalSetupTaskInput): string {
	const rawInputColumns = [
		...input.suggestedInputColumns,
		...(input.directRefs ?? []).map((r) => r.column),
		...(input.namedRefs ?? []).map((r) => r.column),
	];
	const rawOutputColumns = input.suggestedOutputColumns;
	const columnNameByRaw = formatEvalDataTableColumnNameMap([
		...rawInputColumns,
		...rawOutputColumns,
	]);
	const columnNameFor = (column: string) =>
		columnNameByRaw.get(column) ?? formatEvalDataTableColumnName(column);
	const inputColumnNames = [...new Set(rawInputColumns.map(columnNameFor))];
	const outputColumnNames = [...new Set(rawOutputColumns.map(columnNameFor))];
	const dataTableColumns = [...new Set([...inputColumnNames, ...outputColumnNames])];
	const outputColumns = outputColumnNames.map((c) => `- ${c}`).join('\n');
	const inputColumns = inputColumnNames.map((c) => `- ${c}`).join('\n');
	const metrics = input.enabledMetrics
		.map((m) => formatMetric(m, input, columnNameFor))
		.join('\n\n');
	const datasetSection = formatDatasetSection(input, dataTableColumns);
	const setOutputsDataTableInstruction = formatSetOutputsDataTableInstruction(input);
	const adapterSection = formatProductionAdapter(
		input.directRefs ?? [],
		input.namedRefs ?? [],
		columnNameFor,
	);

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

${setOutputsDataTableInstruction} Use \`typeVersion: 4.8\` for the Evaluation node.

METRICS TO CONFIGURE (on setMetrics):
${metrics}

Use the field mappings specified per metric above. Use the explicit name you assign to the EvaluationTrigger node (name it \`"Eval Trigger"\` when creating it, then reference exactly that name everywhere — never use the stock default \`"When fetching a dataset row"\` and never create a separate node for that purpose).

For \`correctness\`, \`helpfulness\`, and \`relevance\` (configured with the native \`helpfulness\` metric): also wire an \`ai_languageModel\` connection from the workflow's existing LLM model node (the one already feeding the AI agent) to each setMetrics node that uses an AI-judged metric. The LLM is reused — same node, additional outgoing \`ai_languageModel\` connection. Without this, AI-judged metrics fail silently. \`stringSimilarity\`/\`categorization\`/\`toolsUsed\` don't need this.

Apply the topology as described in your instructions:
1. EvaluationTrigger → target AI agent node (direct \`main\` connection). No intermediate Set/Code/transform node. The trigger emits each dataset column as \`$json.<column>\`. If the agent's existing parameters reference fields that don't match the listed INPUT COLUMNS, rewrite those parameter expressions to use \`{{ $json.<column> }}\`. NOTE: \`Evaluation(setInputs)\` does NOT reshape data — it only attaches metadata for the eval-results display tab.
2. After the AI agent: insert \`Evaluation(checkIfEvaluating)\` (no separate IF node — it has two native output slots). Slot 0 (Evaluation) routes to setOutputs → setMetrics. Slot 1 (Normal) preserves the original production path with side-effects.

Report back with a one-line summary when done.`;
}
