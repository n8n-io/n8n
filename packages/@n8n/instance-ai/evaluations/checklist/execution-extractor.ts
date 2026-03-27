import type { ChecklistItem, ExecutionChecklist } from '../types';
import { EXECUTION_CHECKLIST_EXTRACT_PROMPT } from '../system-prompts/execution-extract';
import { createEvalAgent, extractText } from '../../src/utils/eval-agents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_EXECUTION_CHECKLIST: ExecutionChecklist = { items: [], testInputs: [] };

/** Build a simplified workflow summary for the LLM (node names, types, parameters — not the full JSON) */
function simplifyWorkflowJson(workflowJson: Record<string, unknown>): string {
	const nodes = Array.isArray(workflowJson.nodes)
		? (workflowJson.nodes as Array<Record<string, unknown>>).map((n) => ({
				name: n.name,
				type: n.type,
				parameters: n.parameters,
			}))
		: [];
	const connections = workflowJson.connections ?? {};
	return JSON.stringify({ nodes, connections }, null, 2);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return null;
	} catch {
		const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			try {
				const parsed: unknown = JSON.parse(objectMatch[0]);
				if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
					return parsed as Record<string, unknown>;
				}
			} catch {
				// fall through
			}
		}
		return null;
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractExecutionChecklist(
	prompt: string,
	workflowJson: Record<string, unknown>,
	seededCredentialTypes?: string[],
	existingExecutionOutput?: Array<{ nodeName: string; data: Record<string, unknown>[] }>,
): Promise<ExecutionChecklist> {
	const workflowSummary = simplifyWorkflowJson(workflowJson);

	const seededSection =
		seededCredentialTypes && seededCredentialTypes.length > 0
			? `\n\n## Seeded credentials (real tokens available)\n\n${seededCredentialTypes.join(', ')}`
			: '\n\n## Seeded credentials (real tokens available)\n\nNone';

	const executionSection =
		existingExecutionOutput && existingExecutionOutput.length > 0
			? `\n\n## Existing execution output (already captured)\n\nThe workflow was already executed successfully. Here is the output from each node:\n\n${existingExecutionOutput.map((n) => `**${n.nodeName}:**\n\`\`\`json\n${JSON.stringify(n.data, null, 2).slice(0, 2000)}\n\`\`\``).join('\n\n')}`
			: '';

	const userMessage = `## User Prompt

${prompt}

## Workflow JSON

${workflowSummary}${seededSection}${executionSection}`;

	const agent = createEvalAgent('eval-execution-checklist-extractor', {
		instructions: EXECUTION_CHECKLIST_EXTRACT_PROMPT,
		cache: true,
	});

	const result = await agent.generate(userMessage, {
		providerOptions: { anthropic: { maxTokens: 16_384 } },
	});

	const content = extractText(result);

	const parsed = parseJsonObject(content);
	if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.testInputs)) {
		return EMPTY_EXECUTION_CHECKLIST;
	}

	return {
		items: parsed.items as ChecklistItem[],
		testInputs: parsed.testInputs as ExecutionChecklist['testInputs'],
	};
}
