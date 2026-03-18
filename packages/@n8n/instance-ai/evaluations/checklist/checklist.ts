import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { callLLM } from './anthropic';
import { CHECKLIST_EXTRACT_PROMPT } from './system-prompts/checklist-extract';
import { CHECKLIST_VERIFY_PROMPT } from './system-prompts/checklist-verify';
import { EXECUTION_CHECKLIST_EXTRACT_PROMPT } from './system-prompts/execution-checklist-extract';
import type { ChecklistItem, ChecklistResult, ExecutionChecklist } from './types';

const EVAL_MODEL = 'claude-sonnet-4-6';
const CACHE_DIR = path.join(__dirname, '..', '.data', 'checklist-cache');
const COMMITTED_CHECKLISTS_PATH = path.join(__dirname, '..', '.data', 'committed-checklists.json');

// ---------------------------------------------------------------------------
// Committed checklists — checked into git for consistency across runs
// ---------------------------------------------------------------------------

interface CommittedEntry {
	prompt: string;
	checklist: ChecklistItem[];
}

type CommittedChecklistsMap = Record<string, CommittedEntry>;

function loadCommittedChecklists(): CommittedChecklistsMap {
	if (!fs.existsSync(COMMITTED_CHECKLISTS_PATH)) return {};
	try {
		const content = fs.readFileSync(COMMITTED_CHECKLISTS_PATH, 'utf-8');
		return JSON.parse(content) as CommittedChecklistsMap;
	} catch {
		return {};
	}
}

function getCommittedChecklist(prompt: string): ChecklistItem[] | null {
	const map = loadCommittedChecklists();
	const hash = promptHash(prompt);
	const entry = map[hash];
	if (!entry || entry.prompt !== prompt) return null;
	return entry.checklist;
}

export function saveCommittedChecklists(
	entries: Array<{ prompt: string; checklist: ChecklistItem[] }>,
): void {
	const dataDir = path.dirname(COMMITTED_CHECKLISTS_PATH);
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}

	const existing = loadCommittedChecklists();

	for (const entry of entries) {
		const hash = promptHash(entry.prompt);
		existing[hash] = { prompt: entry.prompt, checklist: entry.checklist };
	}

	fs.writeFileSync(COMMITTED_CHECKLISTS_PATH, JSON.stringify(existing, null, 2));
}

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
		const parsed: unknown = JSON.parse(jsonStr);
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

export async function extractChecklist(promptText: string): Promise<ChecklistItem[]> {
	// 1. Check committed checklists (checked into git)
	const committed = getCommittedChecklist(promptText);
	if (committed) return committed;

	// 2. Check disk cache
	const cached = getCached(promptText);
	if (cached) return cached;

	const response = await callLLM({
		model: EVAL_MODEL,
		systemPrompt: CHECKLIST_EXTRACT_PROMPT,
		messages: [{ role: 'user', content: promptText }],
	});

	const checklist = parseJsonArray<ChecklistItem>(response.content);
	setCache(promptText, checklist);
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

function parseJsonObject<T>(text: string): T | null {
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
	const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

	try {
		const parsed: unknown = JSON.parse(jsonStr);
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			return parsed as T;
		}
		return null;
	} catch {
		const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
		if (objectMatch) {
			try {
				return JSON.parse(objectMatch[0]) as T;
			} catch {
				return null;
			}
		}
		return null;
	}
}

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

const EMPTY_EXECUTION_CHECKLIST: ExecutionChecklist = { items: [], testInputs: [] };

export async function extractExecutionChecklist(
	promptText: string,
	workflowJson: Record<string, unknown>,
): Promise<ExecutionChecklist> {
	const workflowSummary = simplifyWorkflowJson(workflowJson);

	const userMessage = `## User Prompt

${promptText}

## Workflow JSON

${workflowSummary}`;

	const response = await callLLM({
		model: EVAL_MODEL,
		systemPrompt: EXECUTION_CHECKLIST_EXTRACT_PROMPT,
		messages: [{ role: 'user', content: userMessage }],
	});

	const parsed = parseJsonObject<ExecutionChecklist>(response.content);
	if (!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.testInputs)) {
		return EMPTY_EXECUTION_CHECKLIST;
	}

	return {
		items: parsed.items,
		testInputs: parsed.testInputs,
	};
}

export async function verifyChecklist(
	verificationArtifact: string,
	checklist: ChecklistItem[],
): Promise<ChecklistResult[]> {
	const prompt = `## Checklist

${JSON.stringify(checklist, null, 2)}

## Verification Artifact

${verificationArtifact}

Verify each checklist item against the artifact above.`;

	const response = await callLLM({
		model: EVAL_MODEL,
		systemPrompt: CHECKLIST_VERIFY_PROMPT,
		messages: [{ role: 'user', content: prompt }],
	});

	return parseJsonArray<ChecklistResult>(response.content);
}
