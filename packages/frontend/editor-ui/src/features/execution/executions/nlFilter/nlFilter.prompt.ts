export type NlFilterPromptWorkflow = { id: string; name: string };

export type BuildNlFilterPromptInput = {
	now: Date;
	userText: string;
	workflows: NlFilterPromptWorkflow[];
};

const MAX_WORKFLOWS_IN_PROMPT = 50;

/**
 * Builds the prompt string we hand to the AI Assistant via /ai/ask-ai.
 * Pure function: same input → same output. Tested in isolation.
 *
 * The AI is instructed to reply with ONLY a JSON object matching
 * NlExecutionFilterAiResponseSchema.
 */
export function buildNlFilterPrompt({
	now,
	userText,
	workflows,
}: BuildNlFilterPromptInput): string {
	const inventory = workflows.slice(0, MAX_WORKFLOWS_IN_PROMPT);
	const inventoryLines = inventory.map((wf) => `  - id: ${wf.id} | name: ${wf.name}`).join('\n');

	// JSON.stringify makes the user input a JSON string literal,
	// neutralising newlines, quotes, and prompt-injection attempts.
	const safeUserText = JSON.stringify(userText);

	return [
		'You translate a natural-language query into a JSON filter for an n8n Executions list.',
		'',
		`Current time (ISO 8601, UTC): ${now.toISOString()}`,
		'',
		'Allowed JSON keys (all optional, omit if not implied):',
		'  status: one of "success" | "error" | "running" | "waiting" | "canceled" | "new"',
		'  workflowId: a workflow id from the inventory below',
		'  workflowName: an exact or fuzzy name from the inventory below',
		'  startedAfter: ISO 8601 datetime (compute against the current time above)',
		'  startedBefore: ISO 8601 datetime',
		'',
		'Rules:',
		'  - Reply with ONLY a single JSON object. No prose, no markdown fences.',
		'  - Omit any key the user did not imply. Do not invent values.',
		'  - "failed" / "failures" / "errors" map to status="error".',
		'  - "succeeded" / "ok" / "passed" map to status="success".',
		'  - Relative times ("last 24 hours", "this week", "yesterday") must be resolved against the current time.',
		'  - If the user names a workflow, prefer workflowId from the inventory; fall back to workflowName.',
		'',
		'Workflow inventory (id | name):',
		inventoryLines.length > 0 ? inventoryLines : '  (no workflows visible to this user)',
		'',
		`User query: ${safeUserText}`,
	].join('\n');
}
