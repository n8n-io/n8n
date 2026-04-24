/**
 * Generate realistic eval sample rows via Haiku.
 * 5-7 rows with happy/edge/adversarial distribution.
 */

import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { createEvalAgent, extractText, HAIKU_MODEL } from '../../utils/eval-agents';

const SYSTEM_INSTRUCTIONS = `You generate realistic test rows for an n8n workflow evaluation dataset.

Output: JSON array of objects. Keys = provided column names. Values = short strings. No prose outside the JSON.

Design principles (follow strictly):
- 5-7 rows total.
- Distribution:
  * 2-3 happy path rows — typical, realistic inputs for the workflow's domain.
  * 1-2 edge case rows — empty input, very long input, ambiguous phrasing, multi-language mix, typos.
  * 1-2 adversarial rows — out-of-scope requests, prompt injection, contradictory requirements.

For every row:
- \`expected_output\` (or the output column name) must be what a correctly-behaving workflow SHOULD produce (not what the current model happens to). For adversarial rows: refusal or safe fallback.
- Domain-specific realism. No placeholder text like "test input 1".
- Concise cells.

Anchor the domain in the workflow's node names and types.`;

function buildUserPrompt(workflow: WorkflowJSON, columns: string[]): string {
	const summary = (workflow.nodes ?? []).map((n) => `- ${n.name} (${n.type})`).join('\n');
	return `Workflow: ${workflow.name ?? 'Untitled'}
Nodes:
${summary}

Columns: ${columns.join(', ')}

Generate 5-7 rows per the design principles in your instructions.`;
}

function fallbackRow(columns: string[]): Record<string, string> {
	return Object.fromEntries(columns.map((c) => [c, '']));
}

export async function generateSampleRows(
	workflow: WorkflowJSON,
	columns: string[],
): Promise<Array<Record<string, string>>> {
	try {
		const agent = createEvalAgent('eval-sample-rows', {
			model: HAIKU_MODEL,
			instructions: SYSTEM_INSTRUCTIONS,
		});
		const result = await agent.generate([
			{
				role: 'user',
				content: [{ type: 'text' as const, text: buildUserPrompt(workflow, columns) }],
			},
		]);
		const text = extractText(result);
		const parsed: unknown = JSON.parse(text);
		if (!Array.isArray(parsed) || parsed.length === 0) return [fallbackRow(columns)];
		return parsed.map((rawRow) => {
			const row: Record<string, string> = {};
			const entries =
				typeof rawRow === 'object' && rawRow !== null ? (rawRow as Record<string, unknown>) : {};
			for (const col of columns) {
				const v = entries[col];
				if (v === undefined || v === null) row[col] = '';
				else if (typeof v === 'string') row[col] = v;
				else if (typeof v === 'number' || typeof v === 'boolean') row[col] = String(v);
				else row[col] = JSON.stringify(v);
			}
			return row;
		});
	} catch {
		return [fallbackRow(columns)];
	}
}
