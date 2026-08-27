import type { IDataObject, INodeParameters, INodeTypeDescription } from 'n8n-workflow';

export const GENERATE_MOCK_DATA_MODES = ['success', 'failure', 'describe'] as const;

export type GenerateMockDataMode = (typeof GENERATE_MOCK_DATA_MODES)[number];

/** Mode actually used for generation after resolving Describe + empty hint → Success. */
export type ResolvedGenerateMockDataMode = 'success' | 'failure' | 'describe';

/**
 * Nodes that declare credentials talk to an external service / API.
 * Core utilities like Set, IF, and Code do not.
 */
export function isExternalIntegrationNode(
	nodeType: Pick<INodeTypeDescription, 'credentials'> | null | undefined,
): boolean {
	return (nodeType?.credentials?.length ?? 0) > 0;
}

export function resolveGenerateMockDataMode(
	mode: GenerateMockDataMode,
	scenarioText: string,
): ResolvedGenerateMockDataMode {
	if (mode === 'describe' && scenarioText.trim() === '') {
		return 'success';
	}
	return mode;
}

/** The AI service rejects any `question` longer than this. */
export const MAX_QUESTION_LENGTH = 600;

const MAX_SCENARIO_LENGTH = 200;

/** Below this the parameters add noise rather than context, so they are dropped instead. */
const MIN_PARAMETERS_LENGTH = 40;

function truncate(value: string, maxLength: number): string {
	return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function buildIntent(mode: ResolvedGenerateMockDataMode): string {
	if (mode === 'failure') {
		return 'Generate realistic FAILURE output items for this n8n node (e.g. 4xx error response, auth failure, missing fields).';
	}

	if (mode === 'describe') {
		return 'Generate realistic output items for this n8n node matching the scenario below.';
	}

	return 'Generate realistic SUCCESS output items for this n8n node.';
}

export function buildGenerateMockDataPrompt(options: {
	mode: ResolvedGenerateMockDataMode;
	scenarioText: string;
	nodeType: string;
	nodeName: string;
	parameters: INodeParameters;
}): string {
	const { mode, scenarioText, nodeType, nodeName, parameters } = options;

	const lines = [
		buildIntent(mode),
		'Return ONLY a JSON array of 1-3 objects: no code, no markdown, no { "json": ... } wrappers.',
		`Node: ${nodeName} (${nodeType})`,
	];

	if (mode === 'describe') {
		lines.push(`Scenario: ${truncate(scenarioText.trim(), MAX_SCENARIO_LENGTH)}`);
	}

	const prompt = lines.join('\n');
	const parametersPrefix = '\nParams: ';
	const parametersBudget = MAX_QUESTION_LENGTH - prompt.length - parametersPrefix.length;

	// Node parameters help but are unbounded in size, so they only get whatever budget is left
	if (parametersBudget < MIN_PARAMETERS_LENGTH) {
		return truncate(prompt, MAX_QUESTION_LENGTH);
	}

	return prompt + parametersPrefix + truncate(JSON.stringify(parameters), parametersBudget);
}

function stripCodeWrappers(raw: string): string {
	const fenced = /^```[a-z0-9]*\s*([\s\S]*?)\s*```$/i.exec(raw.trim());
	const text = (fenced ? fenced[1] : raw).trim();

	// The ask-ai `code` path is a code generator, so answers often arrive as `return [...];`
	return text
		.replace(/^return\s+/i, '')
		.replace(/;$/, '')
		.trim();
}

/** First balanced array literal, so surrounding prose or code doesn't break parsing. */
function extractArrayLiteral(text: string): string | null {
	const start = text.indexOf('[');
	if (start === -1) return null;

	let depth = 0;
	let inString = false;
	let isEscaped = false;

	for (let i = start; i < text.length; i++) {
		const char = text[i];

		if (inString) {
			if (isEscaped) isEscaped = false;
			else if (char === '\\') isEscaped = true;
			else if (char === '"') inString = false;
			continue;
		}

		if (char === '"') inString = true;
		else if (char === '[') depth++;
		else if (char === ']' && --depth === 0) return text.slice(start, i + 1);
	}

	return null;
}

/** Items may come back in n8n's `{ json: ... }` execution-data shape rather than as plain objects. */
function unwrapJsonItem(item: IDataObject): IDataObject {
	const { json } = item;

	if (Object.keys(item).length === 1 && json !== null && typeof json === 'object') {
		return json as IDataObject;
	}

	return item;
}

/**
 * Parse a JSON array of objects out of an ask-ai `code` response, tolerating the
 * markdown fences and `return` statements a code-generation prompt tends to add.
 */
export function parseGenerateMockDataResponse(raw: string): IDataObject[] {
	const text = stripCodeWrappers(raw);
	const candidates = [text, extractArrayLiteral(text)];
	let parsed: unknown;

	for (const candidate of candidates) {
		if (candidate === null) continue;

		try {
			parsed = JSON.parse(candidate);
			break;
		} catch {
			// Try the next candidate before giving up
		}
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Expected a JSON array');
	}

	if (parsed.length === 0) {
		throw new Error('Expected a non-empty JSON array');
	}

	for (const item of parsed) {
		if (item === null || typeof item !== 'object' || Array.isArray(item)) {
			throw new Error('Expected an array of objects');
		}
	}

	return (parsed as IDataObject[]).map(unwrapJsonItem);
}
