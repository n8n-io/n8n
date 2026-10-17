import { TrustedMetadataKeySchema, type NodeToolTrustedMetadata } from './agent-json-config.schema';

// Hyphenated names are only valid through brackets: `$json.a-b` is `$json.a` minus `b`.
const JSON_DOT_REFERENCE = /\$json\??\.([A-Za-z_][A-Za-z0-9_]*)/g;
const JSON_BRACKET_REFERENCE = /\$json\??\.?\[\s*(['"`])([A-Za-z0-9_-]+)\1\s*\]/g;
// Same call shape the shared `$fromAI` parser accepts: optional whitespace before `(`.
const FROM_AI_KEY = /\$fromAI\s*\(\s*(['"`])((?:(?!\1)[^\\])+)\1/gi;

/**
 * Copy of an expression with the contents of quoted strings and template
 * literals blanked out, so text inside a literal is not read as a reference.
 * Code inside a template `${...}` placeholder is kept.
 */
function blankStringLiterals(expression: string): string {
	let out = '';
	let quote: string | null = null;
	let placeholderDepth = 0;
	for (let i = 0; i < expression.length; i++) {
		const char = expression[i];
		if (quote === null) {
			if (char === "'" || char === '"' || char === '`') quote = char;
			out += char;
			continue;
		}
		if (char === '\\') {
			out += '  ';
			i++;
			continue;
		}
		if (quote === '`' && placeholderDepth === 0 && char === '$' && expression[i + 1] === '{') {
			placeholderDepth = 1;
			out += '${';
			i++;
			continue;
		}
		if (placeholderDepth > 0) {
			if (char === '{') placeholderDepth++;
			if (char === '}') placeholderDepth--;
			out += char;
			continue;
		}
		if (char === quote) {
			quote = null;
			out += char;
			continue;
		}
		out += ' ';
	}
	return out;
}

function collectStrings(value: unknown, out: string[]): void {
	if (typeof value === 'string') {
		// Only expressions can reference `$json`.
		if (value.startsWith('=')) out.push(value);
	} else if (Array.isArray(value)) {
		for (const item of value) collectStrings(item, out);
	} else if (value !== null && typeof value === 'object') {
		for (const item of Object.values(value)) collectStrings(item, out);
	}
}

/**
 * Variable names a node tool reads from `$json` in its parameter expressions.
 * The model never chooses them: the model-facing schema only holds `$fromAI`
 * keys, so a `$json.<name>` reference can only be satisfied by the caller
 * (Message an Agent) or by the tool's default value for that name.
 */
export function extractNodeToolVariables(nodeParameters: unknown): string[] {
	const expressions: string[] = [];
	collectStrings(nodeParameters, expressions);

	const modelKeys = new Set<string>();
	const names = new Set<string>();
	for (const expression of expressions) {
		for (const match of expression.matchAll(FROM_AI_KEY)) modelKeys.add(match[2]);
		for (const match of blankStringLiterals(expression).matchAll(JSON_DOT_REFERENCE)) {
			names.add(match[1]);
		}
		for (const match of expression.matchAll(JSON_BRACKET_REFERENCE)) names.add(match[2]);
	}

	// Every returned name must be persistable as a trusted metadata key.
	return [...names].filter(
		(name) => !modelKeys.has(name) && TrustedMetadataKeySchema.safeParse(name).success,
	);
}

export interface AgentVariable {
	name: string;
	/** Tool names that read this variable. */
	tools: string[];
	/** Default used when the caller maps no value. Absent when the variable has none. */
	default?: NodeToolTrustedMetadata[string];
}

type ToolWithNode = {
	type: string;
	name?: string;
	node?: { nodeParameters?: unknown };
	trustedMetadata?: NodeToolTrustedMetadata;
};

/**
 * Variables an agent's node tools read, derived from their parameter
 * expressions. A name keeps the first default any tool declares for it.
 */
export function collectAgentVariables(tools: readonly ToolWithNode[] | undefined): AgentVariable[] {
	const byName = new Map<string, AgentVariable>();
	for (const tool of tools ?? []) {
		if (tool.type !== 'node') continue;
		for (const name of extractNodeToolVariables(tool.node?.nodeParameters)) {
			const entry = byName.get(name) ?? { name, tools: [] };
			if (tool.name) entry.tools.push(tool.name);
			// Own-property lookup: `toString` and friends are not defaults.
			if (entry.default === undefined && Object.hasOwn(tool.trustedMetadata ?? {}, name)) {
				entry.default = tool.trustedMetadata?.[name];
			}
			byName.set(name, entry);
		}
	}
	return [...byName.values()];
}
