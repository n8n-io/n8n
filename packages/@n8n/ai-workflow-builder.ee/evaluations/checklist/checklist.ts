import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { callLLM } from './anthropic';
import { CHECKLIST_EXTRACT_PROMPT } from './system-prompts/checklist-extract';
import { CHECKLIST_VERIFY_PROMPT } from './system-prompts/checklist-verify';
import type { ChecklistItem, ChecklistResult } from './types';

const EVAL_MODEL = 'claude-sonnet-4-6';
const CACHE_DIR = path.join(__dirname, '..', '.data', 'checklists');

function promptHash(prompt: string): string {
	return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

function getCached(prompt: string): ChecklistItem[] | null {
	const filePath = path.join(CACHE_DIR, `${promptHash(prompt)}.json`);
	if (!fs.existsSync(filePath)) return null;
	const content = fs.readFileSync(filePath, 'utf-8');
	const entry = JSON.parse(content) as { prompt: string; checklist: ChecklistItem[] };
	// Verify prompt matches (collision guard)
	if (entry.prompt !== prompt) return null;
	return entry.checklist;
}

function setCache(prompt: string, checklist: ChecklistItem[]): void {
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}
	const filePath = path.join(CACHE_DIR, `${promptHash(prompt)}.json`);
	fs.writeFileSync(filePath, JSON.stringify({ prompt, checklist }, null, 2));
}

function parseJsonArray<T>(text: string): T[] {
	// Try to extract JSON from code fences first
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed = JSON.parse(jsonStr);
		if (Array.isArray(parsed)) return parsed as T[];
		return [];
	} catch {
		// Try to find array in the text
		const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			try {
				return JSON.parse(arrayMatch[0]) as T[];
			} catch {
				return [];
			}
		}
		return [];
	}
}

export async function extractChecklist(prompt: string): Promise<ChecklistItem[]> {
	const cached = getCached(prompt);
	if (cached) return cached;

	const response = await callLLM({
		model: EVAL_MODEL,
		systemPrompt: CHECKLIST_EXTRACT_PROMPT,
		messages: [{ role: 'user', content: prompt }],
	});

	const checklist = parseJsonArray<ChecklistItem>(response.content);
	setCache(prompt, checklist);
	return checklist;
}

export function clearCache(): number {
	if (!fs.existsSync(CACHE_DIR)) return 0;
	const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'));
	for (const file of files) {
		fs.unlinkSync(path.join(CACHE_DIR, file));
	}
	return files.length;
}

export async function verifyChecklist(
	code: string,
	checklist: ChecklistItem[],
): Promise<ChecklistResult[]> {
	const prompt = `## Checklist

${JSON.stringify(checklist, null, 2)}

## Generated Code

\`\`\`typescript
${code}
\`\`\`

Verify each checklist item against the code above.`;

	const response = await callLLM({
		model: EVAL_MODEL,
		systemPrompt: CHECKLIST_VERIFY_PROMPT,
		messages: [{ role: 'user', content: prompt }],
	});

	return parseJsonArray<ChecklistResult>(response.content);
}
