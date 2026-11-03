import type { BuiltTool } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';

/** Rough chars-per-token ratio for English prose and JSON. Good enough to compare runs. */
const CHARS_PER_TOKEN = 4;

export interface ContextBudgetSection {
	name: string;
	chars: number;
	tokens: number;
}

export interface ToolBudget {
	name: string;
	descriptionChars: number;
	schemaChars: number;
	systemInstructionChars: number;
	chars: number;
}

export interface ContextBudget {
	sections: ContextBudgetSection[];
	tools: ToolBudget[];
	total: { chars: number; tokens: number };
}

export interface ContextBudgetInput {
	systemPrompt: string;
	skillCatalog: string;
	tools: readonly BuiltTool[];
	/** Skill bodies that a typical run loads and keeps in context. */
	skills?: ReadonlyArray<{ id: string; chars: number }>;
}

function estimateTokens(chars: number): number {
	return Math.ceil(chars / CHARS_PER_TOKEN);
}

function section(name: string, chars: number): ContextBudgetSection {
	return { name, chars, tokens: estimateTokens(chars) };
}

function measureTool(tool: BuiltTool): ToolBudget {
	const schema = zodToJsonSchema(tool.inputSchema);
	const descriptionChars = tool.description.length;
	const schemaChars = schema ? JSON.stringify(schema).length : 0;
	const systemInstructionChars = tool.systemInstruction?.length ?? 0;
	return {
		name: tool.name,
		descriptionChars,
		schemaChars,
		systemInstructionChars,
		// The name is the tool key the model sees. System instructions go into the
		// system message, so they are counted in their own section.
		chars: tool.name.length + descriptionChars + schemaChars,
	};
}

function sum(values: number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

/** Measures the static context that the orchestrator sends on every model call. */
export function measureContextBudget(input: ContextBudgetInput): ContextBudget {
	const tools = input.tools.map(measureTool).sort((a, b) => b.chars - a.chars);
	const sections = [
		section('system prompt', input.systemPrompt.length),
		section('skill catalog', input.skillCatalog.length),
		section('tools', sum(tools.map((t) => t.chars))),
		section('tool system instructions', sum(tools.map((t) => t.systemInstructionChars))),
	];
	if (input.skills) sections.push(section('loaded skills', sum(input.skills.map((s) => s.chars))));

	const chars = sum(sections.map((s) => s.chars));
	return { sections, tools, total: { chars, tokens: estimateTokens(chars) } };
}

/** Renders a budget as markdown tables, for the terminal and for PR descriptions. */
export function formatContextBudget(budget: ContextBudget): string {
	const lines = ['| Section | Chars | Tokens (est.) |', '|---|---:|---:|'];
	for (const { name, chars, tokens } of budget.sections) {
		lines.push(`| ${name} | ${chars} | ${tokens} |`);
	}
	lines.push(`| **total** | ${budget.total.chars} | ${budget.total.tokens} |`, '');

	lines.push(
		'| Tool | Description | Schema | System instruction | Total |',
		'|---|---:|---:|---:|---:|',
	);
	for (const tool of budget.tools) {
		lines.push(
			`| ${tool.name} | ${tool.descriptionChars} | ${tool.schemaChars} | ${tool.systemInstructionChars} | ${tool.chars} |`,
		);
	}
	return lines.join('\n');
}
