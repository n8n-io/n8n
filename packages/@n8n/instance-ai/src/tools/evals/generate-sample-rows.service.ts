import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { createEvalAgent, extractText, HAIKU_MODEL } from '../../utils/eval-agents';

const SYSTEM_INSTRUCTIONS = `You generate realistic test rows for an n8n workflow evaluation dataset.
Return a JSON array of objects. Each object has keys equal to the provided column names.
All values must be short strings suitable for dataset cells. No prose outside the JSON.`;

function buildUserPrompt(workflow: WorkflowJSON, columns: string[], rowCount: number): string {
	const summary = (workflow.nodes ?? []).map((n) => `- ${n.name} (${n.type})`).join('\n');
	return `Workflow: ${workflow.name ?? 'Untitled'}
Nodes:
${summary}

Columns: ${columns.join(', ')}
Generate exactly ${rowCount} sample row(s).`;
}

function fallbackRow(columns: string[]): Record<string, string> {
	return Object.fromEntries(columns.map((c) => [c, '']));
}

export async function generateSampleRows(
	workflow: WorkflowJSON,
	columns: string[],
	rowCount: number,
): Promise<Array<Record<string, string>>> {
	try {
		const agent = createEvalAgent('eval-sample-rows', {
			model: HAIKU_MODEL,
			instructions: SYSTEM_INSTRUCTIONS,
		});
		const result = await agent.generate([
			{ role: 'user', content: buildUserPrompt(workflow, columns, rowCount) },
		]);
		const text = extractText(result);
		const parsed: unknown = JSON.parse(text);
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return [fallbackRow(columns)];
		}
		const normalized: Array<Record<string, string>> = parsed.map((rawRow) => {
			const row: Record<string, string> = {};
			const entries =
				typeof rawRow === 'object' && rawRow !== null ? (rawRow as Record<string, unknown>) : {};
			for (const col of columns) {
				const v = entries[col];
				row[col] = v === undefined || v === null ? '' : String(v);
			}
			return row;
		});
		return normalized;
	} catch {
		return [fallbackRow(columns)];
	}
}
