import type { InstanceAiEvalAgentScenarioSeed } from '@n8n/api-types';
import { createEvalAgent, extractText } from '@n8n/instance-ai';
import { jsonParse } from 'n8n-workflow';

import { buildDateAnchors } from './date-anchors';

// ---------------------------------------------------------------------------
// Phase 1 for agent scenarios. Workflows get LLM-generated trigger pin data
// (generateMockHints); an agent's "trigger" is the user's opening chat
// message. One LLM call produces that message plus the shared data context
// and per-tool hints that keep the HTTP mock responses coherent across tools.
// ---------------------------------------------------------------------------

export interface AgentSeedToolSummary {
	/** Sanitized tool name — the identifier the model will call and the mock layer keys on. */
	name: string;
	kind: 'node' | 'workflow' | 'custom' | 'mcp' | 'other';
	description?: string;
	/** Node type for node tools (e.g. n8n-nodes-base.slackTool). */
	nodeType?: string;
}

export interface GenerateAgentScenarioSeedOptions {
	agentName: string;
	instructions: string;
	tools: AgentSeedToolSummary[];
	scenarioHints?: string;
}

const SYSTEM_PROMPT = `You are a test data planner for n8n AI agents. An agent (system prompt + tools) is exercised by sending it ONE opening user chat message; its tool calls are served by an API mock server. Your job is to produce that opening message, a consistent data context, and per-tool hints that guide the mock server to generate realistic, coherent responses.

RULES:
1. Create a "globalContext" that defines the shared world — user IDs, entity names, channel names, email addresses, and relationships that ALL tool responses should reference consistently.
2. Create an "openingMessage": the exact first chat message a user would send to this agent to start the scenario.
   - Write it as a real user would — natural language, first person, no meta-commentary about testing.
   - It must actually trigger the behavior under test: include the concrete names, IDs, dates, and values the agent needs to act (drawn from globalContext / the Test Scenario).
   - CRITICAL: openingMessage must NEVER be empty. When the scenario describes vague input ("user asks something unclear"), write that vague message verbatim, not a description of it.
3. Create a "toolHints" object with one entry per tool, keyed EXACTLY by the tool names provided. Each hint describes what data that tool's API responses should contain, referencing entities from the global context. Entries marked (mcp) are MCP tool servers: their hint should describe both the tools that server plausibly exposes and the data those tools return.
4. Hints describe DATA CONTENT, not API response format. The mock server already knows the API schema.
5. Ensure data flows logically: if the scenario implies the agent looks something up and then acts on it, the looked-up data must contain what the action needs.
6. Use realistic but clearly fake values (e.g., "jane@example.com", "U_abc123").
7. **If a "Test Scenario" section is provided, it OVERRIDES your default data generation.** Use the exact names, emails, numeric magnitudes, and conditions described. The scenario defines the test — follow it precisely.
8. **Allocate scenario error conditions explicitly.** When the Test Scenario describes an error/failure/missing-data condition for a SPECIFIC entity, the affected tool's hint MUST name the exact entity and identifier, state the exact API error response the mock must return for requests targeting that entity, and state that requests for all OTHER entities succeed normally. The mock server handles one request at a time — an implicit error condition never gets simulated.
9. **Dates and timestamps.** The user prompt ends with a "## Date anchors" block listing today's real date plus relative anchors. EVERY date you emit — in globalContext, openingMessage, and toolHints — MUST be derived from those anchors, never from training data. When the scenario describes a relative window ("last 2 weeks"), compute concrete dates from the anchors and place records safely INSIDE the window, never on its boundary. State those concrete dates so every tool's mock uses the same ones.
10. Return ONLY valid JSON, no explanation or markdown fencing.`;

function buildUserPrompt(options: GenerateAgentScenarioSeedOptions): string {
	const sections: string[] = [
		'Generate the opening user message, data context, and per-tool mock hints for this agent.',
	];

	if (options.scenarioHints) {
		sections.push('', '## Test Scenario', '', options.scenarioHints);
	}

	sections.push('', '## Agent', '', `Name: ${options.agentName}`, '', '### Instructions', '');
	sections.push(options.instructions);

	sections.push('', '## Tools', '');
	if (options.tools.length === 0) {
		sections.push('(none — the agent answers from its instructions alone)');
	}
	for (const tool of options.tools) {
		let line = `- ${tool.name} (${tool.kind}${tool.nodeType ? `: ${tool.nodeType}` : ''})`;
		if (tool.description) line += ` — ${tool.description}`;
		sections.push(line);
	}

	sections.push('', '## Expected Output', '', '```json', '{');
	sections.push('  "globalContext": "Shared entities: ...",');
	sections.push('  "openingMessage": "The exact first chat message the user sends...",');
	sections.push('  "toolHints": {');
	for (let i = 0; i < Math.min(options.tools.length, 3); i++) {
		const comma = i < Math.min(options.tools.length, 3) - 1 ? ',' : '';
		sections.push(`    "${options.tools[i].name}": "What data to return..."${comma}`);
	}
	if (options.tools.length > 3) sections.push('    ...');
	sections.push('  }', '}', '```');

	// Anchors go last so they are the freshest context before generation.
	sections.push('', '## Date anchors', buildDateAnchors(new Date()));

	return sections.join('\n');
}

const MAX_SEED_ATTEMPTS = 2;
// Generous stall guard, matching Phase-1 hint generation: aborting
// mid-generation truncates the JSON and the scenario cannot run at all
// without an opening message.
const SEED_LLM_TIMEOUT_MS = 300_000;

function parseSeed(raw: string): Omit<InstanceAiEvalAgentScenarioSeed, 'warnings'> | undefined {
	const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
	const parsed = jsonParse<Record<string, unknown>>(text, { fallbackValue: {} });

	const openingMessage = typeof parsed.openingMessage === 'string' ? parsed.openingMessage : '';
	if (openingMessage.trim().length === 0) return undefined;

	const globalContext = typeof parsed.globalContext === 'string' ? parsed.globalContext : '';
	const toolHints: Record<string, string> = {};
	if (parsed.toolHints !== null && typeof parsed.toolHints === 'object') {
		for (const [key, value] of Object.entries(parsed.toolHints as Record<string, unknown>)) {
			if (typeof value === 'string') toolHints[key] = value;
		}
	}

	return { openingMessage, globalContext, toolHints };
}

/**
 * One LLM call → openingMessage + globalContext + per-tool hints. Retried once
 * on structural issues; throws a FRAMEWORK ISSUE error when both attempts fail
 * — an agent scenario cannot run without an opening message.
 */
export async function generateAgentScenarioSeed(
	options: GenerateAgentScenarioSeedOptions,
): Promise<InstanceAiEvalAgentScenarioSeed> {
	const userPrompt = buildUserPrompt(options);
	const warnings: string[] = [];

	for (let attempt = 1; attempt <= MAX_SEED_ATTEMPTS; attempt++) {
		try {
			const agent = createEvalAgent('eval-agent-seed-generator', {
				instructions: SYSTEM_PROMPT,
			});
			const result = await agent.generate(userPrompt, {
				providerOptions: { anthropic: { maxTokens: 8192 } },
				abortSignal: AbortSignal.timeout(SEED_LLM_TIMEOUT_MS),
			});

			const seed = parseSeed(extractText(result));
			if (seed) return { ...seed, warnings };
			warnings.push(`Seed generation attempt ${attempt} returned no usable openingMessage`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			warnings.push(`Seed generation attempt ${attempt} failed: ${message}`);
		}
	}

	throw new Error(
		`FRAMEWORK ISSUE: agent scenario seed generation failed — ${warnings.join('; ')}`,
	);
}
