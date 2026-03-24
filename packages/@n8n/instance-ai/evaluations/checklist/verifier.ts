import Anthropic from '@anthropic-ai/sdk';

import type { ChecklistItem, ChecklistResult } from '../types';
import { CHECKLIST_VERIFY_PROMPT } from '../system-prompts/checklist-verify';
import { runProgrammaticCheck } from './programmatic-checks';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EVAL_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16_384;

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton)
// ---------------------------------------------------------------------------

let _client: Anthropic | undefined;

function getClient(): Anthropic {
	if (!_client) {
		_client = new Anthropic({
			apiKey: process.env.N8N_AI_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY,
		});
	}
	return _client;
}

// ---------------------------------------------------------------------------
// JSON parsing helpers
// ---------------------------------------------------------------------------

function parseJsonArray(text: string): unknown[] {
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (Array.isArray(parsed)) return parsed;
		return [];
	} catch {
		const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			try {
				const parsed: unknown = JSON.parse(arrayMatch[0]);
				if (Array.isArray(parsed)) return parsed;
			} catch {
				// fall through
			}
		}
		return [];
	}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function verifyChecklist(
	checklist: ChecklistItem[],
	verificationArtifact: string,
	workflowJsons: Record<string, unknown>[],
): Promise<ChecklistResult[]> {
	const programmaticItems = checklist.filter((i) => i.strategy === 'programmatic' && i.check);
	const llmItems = checklist.filter((i) => i.strategy === 'llm');

	const results: ChecklistResult[] = [];

	// -----------------------------------------------------------------------
	// 1. Run programmatic checks (synchronous, against first workflow JSON)
	// -----------------------------------------------------------------------

	const workflowJson = workflowJsons.length > 0 ? workflowJsons[0] : {};

	for (const item of programmaticItems) {
		if (!item.check) continue;

		const checkResult = runProgrammaticCheck(workflowJson, item.check);
		results.push({
			id: item.id,
			pass: checkResult.pass,
			reasoning: checkResult.reasoning,
			strategy: 'programmatic',
		});
	}

	// -----------------------------------------------------------------------
	// 2. Run LLM verification for semantic items
	// -----------------------------------------------------------------------

	if (llmItems.length > 0) {
		const userMessage = `## Checklist

${JSON.stringify(llmItems, null, 2)}

## Verification Artifact

${verificationArtifact}

Verify each checklist item against the artifact above.`;

		const client = getClient();

		const response = await client.messages.create({
			model: EVAL_MODEL,
			max_tokens: MAX_TOKENS,
			system: [
				{
					type: 'text',
					text: CHECKLIST_VERIFY_PROMPT,
					cache_control: { type: 'ephemeral' },
				},
			],
			messages: [{ role: 'user', content: userMessage }],
		});

		const content = response.content
			.filter((block): block is Anthropic.TextBlock => block.type === 'text')
			.map((block) => block.text)
			.join('');

		const rawResults = parseJsonArray(content);

		for (const raw of rawResults) {
			const entry = raw as Record<string, unknown>;
			if (typeof entry.id === 'number' && typeof entry.pass === 'boolean') {
				results.push({
					id: entry.id,
					pass: entry.pass,
					reasoning: typeof entry.reasoning === 'string' ? entry.reasoning : '',
					strategy: 'llm',
				});
			}
		}
	}

	// Sort results by id for deterministic output
	results.sort((a, b) => a.id - b.id);

	return results;
}
