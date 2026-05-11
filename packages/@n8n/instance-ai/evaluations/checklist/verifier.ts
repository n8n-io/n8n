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

const MAX_VERIFY_ATTEMPTS = 2;
const VERIFY_ATTEMPT_TIMEOUT_MS = 120_000;

export async function verifyChecklist(
	checklist: ChecklistItem[],
	verificationArtifact: string,
	_workflowJsons: WorkflowResponse[],
): Promise<ChecklistResult[]> {
	const llmItems = checklist.filter((i) => i.strategy === 'llm');
	if (llmItems.length === 0) return [];

	const userMessage = `## Checklist

${JSON.stringify(llmItems, null, 2)}

## Verification Artifact

${verificationArtifact}

Verify each checklist item against the artifact above.`;

	const validIds = new Set(llmItems.map((i) => i.id));

	for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
		const agent = createEvalAgent('eval-checklist-verifier', {
			instructions: MOCK_EXECUTION_VERIFY_PROMPT,
			cache: true,
		}).structuredOutput(checklistResultSchema);

		const abortController = new AbortController();
		const timer = setTimeout(
			() =>
				abortController.abort(new Error(`verifier timed out after ${VERIFY_ATTEMPT_TIMEOUT_MS}ms`)),
			VERIFY_ATTEMPT_TIMEOUT_MS,
		);
		let result;
		try {
			result = await agent.generate(userMessage, { abortSignal: abortController.signal });
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			console.warn(`[verifier] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} failed: ${msg}`);
			continue;
		} finally {
			clearTimeout(timer);
		}

		const parsed = result.structuredOutput as z.infer<typeof checklistResultSchema> | undefined;
		const results: ChecklistResult[] = [];

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
						failureCategory:
							entry.failureCategory ?? (!entry.pass ? 'verification_failure' : undefined),
						rootCause: entry.rootCause,
					});
				}
			}
		}

		if (results.length > 0) {
			results.sort((a, b) => a.id - b.id);
			return results;
		}

		console.warn(
			`[verifier] attempt ${attempt}/${MAX_VERIFY_ATTEMPTS} produced no parseable results`,
		);
	}

	console.warn(`[verifier] exhausted ${MAX_VERIFY_ATTEMPTS} attempts, returning empty result`);
	return [];
}
