import crypto from 'node:crypto';

import Anthropic from '@anthropic-ai/sdk';

import { checklistItemSchema, type ChecklistItem } from '../types';
import { CHECKLIST_EXTRACT_PROMPT } from '../system-prompts/checklist-extract';

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

	const client = getClient();

	const response = await client.messages.create({
		model: EVAL_MODEL,
		max_tokens: MAX_TOKENS,
		system: [
			{ type: 'text', text: CHECKLIST_EXTRACT_PROMPT, cache_control: { type: 'ephemeral' } },
		],
		messages: [{ role: 'user', content: prompt }],
	});

	const content = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map((block) => block.text)
		.join('');

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
