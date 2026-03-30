import crypto from 'node:crypto';

import { createEvalAgent, extractText } from '../../src/utils/eval-agents';
import { CHECKLIST_EXTRACT_PROMPT } from '../system-prompts/checklist-extract';
import { checklistItemSchema, type ChecklistItem } from '../types';

// ---------------------------------------------------------------------------
// In-memory cache keyed by SHA-256 of prompt
// ---------------------------------------------------------------------------

const cache = new Map<string, ChecklistItem[]>();

function promptHash(prompt: string): string {
	return crypto.createHash('sha256').update(prompt).digest('hex');
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

export async function extractBuildChecklist(prompt: string): Promise<ChecklistItem[]> {
	const hash = promptHash(prompt);

	const cached = cache.get(hash);
	if (cached) return cached;

	const agent = createEvalAgent('eval-checklist-extractor', {
		instructions: CHECKLIST_EXTRACT_PROMPT,
		cache: true,
	});

	const result = await agent.generate(prompt, {
		providerOptions: { anthropic: { maxTokens: 16_384 } },
	});

	const content = extractText(result);

	const rawItems = parseJsonArray(content);

	const items: ChecklistItem[] = [];
	for (const raw of rawItems) {
		const parsed = checklistItemSchema.safeParse(raw);
		if (parsed.success) {
			items.push(parsed.data);
		}
	}

	cache.set(hash, items);
	return items;
}
