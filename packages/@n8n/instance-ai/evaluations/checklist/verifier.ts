import { z } from 'zod';

import { createEvalAgent } from '../../src/utils/eval-agents';
import type { WorkflowResponse } from '../clients/n8n-client';
import { MOCK_EXECUTION_VERIFY_PROMPT } from '../system-prompts/mock-execution-verify';
import type { ChecklistItem, ChecklistResult } from '../types';

// ---------------------------------------------------------------------------
// Structured output schema
// ---------------------------------------------------------------------------

const checklistResultSchema = z.object({
	results: z.array(
		z.object({
			id: z.number(),
			pass: z.boolean(),
			reasoning: z.string(),
			failureCategory: z.string().optional(),
			rootCause: z.string().optional(),
		}),
	),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function verifyChecklist(
	checklist: ChecklistItem[],
	verificationArtifact: string,
	_workflowJsons: WorkflowResponse[],
): Promise<ChecklistResult[]> {
	const llmItems = checklist.filter((i) => i.strategy === 'llm');
	const results: ChecklistResult[] = [];

	if (llmItems.length > 0) {
		const userMessage = `## Checklist

${JSON.stringify(llmItems, null, 2)}

## Verification Artifact

${verificationArtifact}

Verify each checklist item against the artifact above.`;

		const agent = createEvalAgent('eval-checklist-verifier', {
			instructions: MOCK_EXECUTION_VERIFY_PROMPT,
			cache: true,
		}).structuredOutput(checklistResultSchema);

		const result = await agent.generate(userMessage);

		const validIds = new Set(llmItems.map((i) => i.id));
		const parsed = result.structuredOutput as z.infer<typeof checklistResultSchema> | undefined;

		if (parsed?.results) {
			for (const entry of parsed.results) {
				if (
					typeof entry.id === 'number' &&
					typeof entry.pass === 'boolean' &&
					validIds.has(entry.id)
				) {
					results.push({
						id: entry.id,
						pass: entry.pass,
						reasoning: entry.reasoning ?? '',
						strategy: 'llm',
						failureCategory: entry.failureCategory,
						rootCause: entry.rootCause,
					});
				}
			}
		} else {
			console.warn(
				'[verifier] structuredOutput returned null — LLM did not produce parseable results',
			);
		}
	}

	// Sort results by id for deterministic output
	results.sort((a, b) => a.id - b.id);

	return results;
}
