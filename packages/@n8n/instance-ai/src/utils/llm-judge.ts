/**
 * Shared LLM-as-judge helpers.
 *
 * Used by both the workflow binary-check factory and the computer-use eval
 * graders. Centralizes the "respond with a JSON verdict" instruction suffix,
 * the parsing of fenced/bare JSON, and the verdict shape.
 */

const FENCED_JSON = /```(?:json)?\s*\n?([\s\S]*?)```/;
const BARE_JSON_OBJECT = /\{[\s\S]*\}/;

/**
 * Plain-markdown fallback patterns. Some judges (notably Haiku 4.5) ignore
 * the JSON-fence instruction and respond with prose ending in
 * `**Verdict:** PASS` or similar. Scanning the tail of the text for these
 * keeps a verdict parseable without forcing the prompt to be louder.
 *
 * Order matters: more specific (verdict word) before more generic (pass key).
 */
const MARKDOWN_VERDICT_PATTERNS: Array<{ regex: RegExp; passToken: string }> = [
	{ regex: /\*{0,2}\s*verdict\s*\*{0,2}\s*:\s*\*{0,2}\s*(pass|fail)/i, passToken: 'pass' },
	{ regex: /\*{0,2}\s*pass\s*\*{0,2}\s*:\s*\*{0,2}\s*(true|false)/i, passToken: 'true' },
	{ regex: /\*{0,2}\s*decision\s*\*{0,2}\s*:\s*\*{0,2}\s*(pass|fail)/i, passToken: 'pass' },
];

// Strip a leading `**Reasoning:**`, `**Reasoning**:`, or `Reasoning:` heading
// — but never plain prose that happens to start with the word "Reasoning".
const REASONING_HEADER =
	/^\s*(?:\*\*\s*reasoning\s*\*\*\s*:|\*\*\s*reasoning\s*:\s*\*\*|reasoning\s*:)\s*/i;

function tryParseMarkdownVerdict(text: string): JudgeVerdict | undefined {
	// Search the tail first — the verdict typically lives at the end. Falling
	// back to the full text catches verdicts that appear mid-document.
	const tail = text.slice(-500);
	for (const haystack of [tail, text]) {
		for (const { regex, passToken } of MARKDOWN_VERDICT_PATTERNS) {
			const match = regex.exec(haystack);
			if (!match) continue;
			const pass = match[1].toLowerCase() === passToken;
			const reasoningRaw = text.slice(0, text.indexOf(match[0])).trim();
			const reasoning = reasoningRaw.replace(REASONING_HEADER, '').trim() || '(no reasoning)';
			return { pass, reasoning };
		}
	}
	return undefined;
}

/**
 * Suffix appended to a judge's system prompt. Forces the model to commit to
 * a binary verdict in a parseable shape.
 */
export const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your reasoning FIRST, then decide pass or fail. Be concise — focus only on critical issues.

Respond with a JSON object (inside a markdown code fence) with exactly two fields:
- "reasoning": brief analysis (max 3-4 sentences)
- "pass": true or false`;

export interface JudgeVerdict {
	reasoning: string;
	pass: boolean;
}

function tryParse(jsonStr: string): JudgeVerdict | undefined {
	try {
		const parsed: unknown = JSON.parse(jsonStr);
		return isJudgeVerdict(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function isJudgeVerdict(value: unknown): value is JudgeVerdict {
	if (typeof value !== 'object' || value === null) return false;
	if (!('pass' in value) || !('reasoning' in value)) return false;
	return typeof value.pass === 'boolean' && typeof value.reasoning === 'string';
}

/**
 * Parse a `{ reasoning, pass }` verdict from LLM text output.
 * Tries fenced JSON, then bare JSON, then a plain-markdown fallback for
 * judges that respond with prose ending in `**Verdict:** PASS` etc.
 * Returns `undefined` when no valid verdict is found.
 */
export function parseJudgeVerdict(text: string): JudgeVerdict | undefined {
	const fenceMatch = text.match(FENCED_JSON);
	const fenced = fenceMatch ? tryParse(fenceMatch[1].trim()) : tryParse(text.trim());
	if (fenced) return fenced;

	const objectMatch = text.match(BARE_JSON_OBJECT);
	const bare = objectMatch ? tryParse(objectMatch[0]) : undefined;
	if (bare) return bare;

	return tryParseMarkdownVerdict(text);
}
