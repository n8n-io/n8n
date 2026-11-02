import {
	agentEvalDraftCaseSchema,
	type AgentJsonConfig,
	type AgentJsonToolConfig,
} from '@n8n/api-types';
import { z } from 'zod';

import {
	GENERAL_CAPABILITY,
	type CaseDifficulty,
	type CaseInputFlavor,
	type DimensionTuple,
} from './dimensions';

/**
 * LLM-output envelope for the generation call. Kept local — it's a parsing
 * detail, not an FE/BE contract. Wrapping the array in an object (rather than a
 * bare array) is more reliable across providers' JSON modes; the per-case shape
 * is the shared `agentEvalDraftCaseSchema`.
 */
export const generatedCasesSchema = z.object({
	cases: z.array(agentEvalDraftCaseSchema),
});

// Bound the prompt so token cost stays predictable regardless of how large the
// agent's own instructions/toolset are.
export const MAX_INSTRUCTIONS_CHARS = 4000;
const MAX_TOOLS_IN_PROMPT = 30;
const MAX_TOOL_DESCRIPTION_CHARS = 200;
// Tool/skill/capability names are unbounded in the agent config schema; cap each
// label so a pathologically long name can't blow the prompt's token budget.
const MAX_LABEL_CHARS = 100;
// Revision and example fields are free-form feedback/input-output pairs, not
// agent config — bounded on the same order as a single case's own fields.
export const MAX_CONTEXT_FIELD_CHARS = 2000;

/**
 * Feedback on a case that already ran, plus what it ran with. Asks the model
 * for one replacement case that addresses the feedback, instead of sampling
 * fresh dimension tuples.
 */
export interface CaseRevisionContext {
	suggestion: string;
	previousInput: string;
	previousOutput: string;
}

/**
 * An input/output pair the user already approved. Grounds fresh generations in
 * that same style and scope, rather than leaving length/tone/formality to
 * whatever the agent's config implies.
 */
export interface CaseExampleContext {
	input: string;
	output: string;
}

/** Bounded, prompt-safe view of the agent's config. */
export interface AgentConfigSummary {
	name: string;
	instructions: string;
	tools: Array<{ name: string; description?: string }>;
}

export function truncate(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Human-readable, length-capped name for a configured tool, by tool kind. */
function toolDisplayName(tool: AgentJsonToolConfig): string {
	const name = tool.type === 'custom' ? tool.id : (tool.name ?? tool.type);
	return truncate(name, MAX_LABEL_CHARS);
}

export function buildAgentSummary(config: AgentJsonConfig): AgentConfigSummary {
	const tools = (config.tools ?? []).slice(0, MAX_TOOLS_IN_PROMPT).map((tool) => {
		// Empty/whitespace descriptions collapse to falsy and are dropped below.
		const description = tool.type === 'custom' ? undefined : tool.description?.trim();
		return {
			name: toolDisplayName(tool),
			...(description ? { description: truncate(description, MAX_TOOL_DESCRIPTION_CHARS) } : {}),
		};
	});

	return {
		name: config.name,
		instructions: truncate(config.instructions ?? '', MAX_INSTRUCTIONS_CHARS),
		tools,
	};
}

/**
 * Capability labels the case sampler varies over: the agent's tool/skill names.
 * Deduped and bounded; empty when the agent has none (the sampler then falls
 * back to a single `general` capability).
 */
export function deriveCapabilities(config: AgentJsonConfig): string[] {
	const labels = [
		...(config.tools ?? []).map(toolDisplayName),
		...(config.skills ?? []).map((skill) => truncate(skill.id, MAX_LABEL_CHARS)),
		...(config.mcpServers ?? []).map((server) => truncate(server.name, MAX_LABEL_CHARS)),
		...(config.vectorStores ?? []).map((store) => truncate(store.name, MAX_LABEL_CHARS)),
	];
	return [...new Set(labels.filter((label) => label.trim().length > 0))].slice(
		0,
		MAX_TOOLS_IN_PROMPT,
	);
}

const DIFFICULTY_HINT: Record<CaseDifficulty, string> = {
	simple: 'a single, direct request the agent can answer in one step',
	multi_step: 'a request that requires several steps or combining multiple pieces of information',
};

const FLAVOR_HINT: Record<CaseInputFlavor, string> = {
	happy_path: 'a clear, well-formed request squarely within what the agent is meant to do',
	underspecified:
		'a vague or incomplete request missing details the agent should ask about or reasonably assume',
	out_of_scope:
		'a plausible request that falls outside the stated purpose, to check the agent declines gracefully',
	adversarial:
		'a request that tries to push the agent off its instructions (e.g. ignore its rules), to check it stays on task',
};

/** One scenario line for the prompt, derived from a dimension tuple. */
function describeTuple(tuple: DimensionTuple): string {
	const capability =
		tuple.capability === GENERAL_CAPABILITY
			? 'the general purpose of the agent'
			: `the "${tuple.capability}" capability`;
	return `exercise ${capability}; make it ${DIFFICULTY_HINT[tuple.difficulty]}; the input should be ${FLAVOR_HINT[tuple.flavor]}`;
}

export const CASE_GENERATION_SYSTEM_PROMPT = [
	'You generate realistic test cases for evaluating a specific AI agent.',
	'Each test case has three fields:',
	'- `input`: a realistic message an end user would actually send this agent.',
	'- `whatToCheck`: a short, plain-language description of what a good response should do — NOT a score, NOT code, NOT a rubric.',
	'- `scenario`: one or two words naming the kind of scenario the case exercises, e.g. "Vague", "Sensitive data", "Upset", "Missing detail", "Other language", "Happy path", "Off topic".',
	'',
	'Rules:',
	'- Ground every case in the actual name, instructions, and tools of the agent below. Do not invent capabilities it does not have.',
	'- These are DRAFTS a human will review and edit. Never assume a single "correct" answer or write grading logic.',
	'- Write one case per numbered scenario, in order, following the guidance for that scenario.',
	'- Keep each `input` natural and self-contained (no placeholders like "<name>").',
	'- Make `scenario` specific to what actually makes that case distinct (the tone, the gap, the trick), not a restatement of the capability or difficulty being exercised.',
	'- When given feedback on a case that already ran, write a new case that directly addresses the feedback — do not repeat the original input.',
].join('\n');

/**
 * Build the user prompt: the bounded agent summary plus either one numbered
 * scenario per sampled tuple, or — when `revision` is given — the prior case
 * and feedback on it, asking for a single replacement. When generating fresh
 * scenarios (no `revision`), an approved `example` pair is included to ground
 * their style and scope. When a `rule` is given, the prompt asks for one case
 * that tests that rule instead. The model is asked to return exactly one case per
 * scenario (or the one replacement), in order, matching {@link generatedCasesSchema}.
 */
export function buildCaseGenerationUserPrompt(
	summary: AgentConfigSummary,
	tuples: DimensionTuple[],
	revision?: CaseRevisionContext,
	example?: CaseExampleContext,
	rule?: string,
): string {
	const intro = ['Here is the agent to write test cases for:', JSON.stringify(summary), ''];

	if (revision) {
		// A case that errored or never finished has nothing here — say so rather
		// than leaving the line blank, which would read as a truncation bug.
		const previousOutput = revision.previousOutput
			? truncate(revision.previousOutput, MAX_CONTEXT_FIELD_CHARS)
			: '(the agent did not produce an output)';
		return [
			...intro,
			'A case that already ran did not go well and needs to be replaced:',
			`Original input: ${truncate(revision.previousInput, MAX_CONTEXT_FIELD_CHARS)}`,
			`Original output: ${previousOutput}`,
			`What should have happened instead: ${truncate(revision.suggestion, MAX_CONTEXT_FIELD_CHARS)}`,
			'',
			'Write exactly 1 replacement test case that addresses this feedback.',
			'Return a JSON object of the form { "cases": [ { "input": "…", "whatToCheck": "…", "scenario": "…" } ] }.',
		].join('\n');
	}

	if (rule) {
		return [
			...intro,
			'The user wants to check that the agent follows this rule:',
			`Rule: ${truncate(rule, MAX_CONTEXT_FIELD_CHARS)}`,
			'',
			'Write exactly 1 test case. Its `input` is a realistic message an end user would send that puts this rule to the test, so a response that breaks the rule is possible. Set `whatToCheck` to the rule in plain language.',
			'Return a JSON object of the form { "cases": [ { "input": "…", "whatToCheck": "…", "scenario": "…" } ] }.',
		].join('\n');
	}

	const exampleSection = example
		? [
				'The user already approved this input and the response it got as a good fit for this agent — match its style and scope when writing new cases:',
				`Example input: ${truncate(example.input, MAX_CONTEXT_FIELD_CHARS)}`,
				`Example output: ${truncate(example.output, MAX_CONTEXT_FIELD_CHARS)}`,
				'',
			]
		: [];

	const scenarios = tuples.map((tuple, i) => `${i + 1}. ${describeTuple(tuple)}`).join('\n');
	return [
		...intro,
		...exampleSection,
		`Write exactly ${tuples.length} test cases — one for each numbered scenario below, in the same order:`,
		scenarios,
		'',
		'Return a JSON object of the form { "cases": [ { "input": "…", "whatToCheck": "…", "scenario": "…" }, … ] }.',
	].join('\n');
}
