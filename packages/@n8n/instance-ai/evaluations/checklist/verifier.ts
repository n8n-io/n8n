import { createEvalAgent, extractText } from '../../src/utils/eval-agents';
import type { WorkflowResponse } from '../clients/n8n-client';
import { MOCK_EXECUTION_VERIFY_PROMPT } from '../system-prompts/mock-execution-verify';
import type { ChecklistItem, ChecklistResult } from '../types';

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------

function parseJsonArray(text: string): unknown[] {
	// Try fenced code block first
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (Array.isArray(parsed)) return parsed;
	} catch {
		// Try extracting array from anywhere in the text
		const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			try {
				const parsed: unknown = JSON.parse(arrayMatch[0]);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				// fall through
			}
		}
	}

	// Log failure for debugging — this causes "No verification result"
	console.warn(
		`[verifier] Failed to parse JSON array from LLM response (${text.length} chars). First 500 chars: ${text.slice(0, 500)}`,
	);
	return [];
}

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
		});

		const result = await agent.generate(userMessage, {
			providerOptions: { anthropic: { maxTokens: 16_384 } },
		});

		const content = extractText(result);

		const rawResults = parseJsonArray(content);

		const validIds = new Set(llmItems.map((i) => i.id));
		for (const raw of rawResults) {
			const entry = raw as Record<string, unknown>;
			if (
				typeof entry.id === 'number' &&
				typeof entry.pass === 'boolean' &&
				validIds.has(entry.id)
			) {
				results.push({
					id: entry.id,
					pass: entry.pass,
					reasoning: typeof entry.reasoning === 'string' ? entry.reasoning : '',
					strategy: 'llm',
					failureCategory:
						typeof entry.failureCategory === 'string' ? entry.failureCategory : undefined,
					rootCause: typeof entry.rootCause === 'string' ? entry.rootCause : undefined,
				});
			}
		}
	}

	// Sort results by id for deterministic output
	results.sort((a, b) => a.id - b.id);

	return results;
}
