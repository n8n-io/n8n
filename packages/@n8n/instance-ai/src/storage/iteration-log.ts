import { z } from 'zod';

// ── Schema (source of truth) ────────────────────────────────────────────────

export const iterationEntrySchema = z.object({
	attempt: z.number().int().min(1),
	action: z.string(),
	result: z.string(),
	error: z.string().optional(),
	diagnosis: z.string().optional(),
	fixApplied: z.string().optional(),
});

export type IterationEntry = z.infer<typeof iterationEntrySchema>;

// ── Interface ────────────────────────────────────────────────────────────────

export interface IterationLog {
	append(threadId: string, taskKey: string, entry: IterationEntry): Promise<void>;
	getForTask(threadId: string, taskKey: string): Promise<IterationEntry[]>;
	clear(threadId: string): Promise<void>;
}

// ── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format iteration entries as a `<previous-attempts>` block for sub-agent briefings.
 * Returns empty string when there are no entries.
 */
export function formatPreviousAttempts(entries: IterationEntry[]): string {
	if (entries.length === 0) return '';

	const lines = entries.map((e) => {
		let line = `Attempt ${e.attempt}: ${e.action}`;
		if (e.error) line += ` → FAILED: ${e.error}`;
		else line += ` → ${e.result.slice(0, 200)}`;
		if (e.diagnosis) line += ` | Diagnosis: ${e.diagnosis}`;
		if (e.fixApplied) line += ` | Fix applied: ${e.fixApplied}`;
		return line;
	});

	return `<previous-attempts>\n${lines.join('\n')}\n</previous-attempts>`;
}
