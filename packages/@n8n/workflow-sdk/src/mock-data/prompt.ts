import { describeAiRootShape, findEnvelopeKey, isAiRootNodeType } from './ai-root-shapes';
import { collectDownstreamConsumers } from './context';
import { workflowToMermaid } from './mermaid';
import type { NodeSchemaContext, PinDataGenerationInstructions } from './types';
import type { WorkflowJSON } from '../types/base';

export const PIN_DATA_SYSTEM_PROMPT = `You are a test data generator for n8n workflow automation. Generate realistic mock API response data for service nodes in a workflow.

RULES:
1. Data must be consistent across nodes. If node A creates an entity with id "abc-123", downstream nodes referencing that entity must use "abc-123". When a node's "Direct downstream consumers" are listed, emit EXACTLY the field names their parameters/expressions/code read (e.g. a Code node reading item.json.last_details requires a field named "last_details") — never rename or synonymize them.
2. Generate 1-2 items per node.
3. When a JSON Schema is provided, follow its structure exactly.
4. When no schema is provided, generate a realistic response based on the node type, resource, and operation.
5. Use realistic but clearly fake values (e.g., "jane@example.com", "proj_abc123").
6. Dates and timestamps MUST be derived from the "## Date anchors" block at the end of the prompt — never from training data. Workflows compare pinned data against the real execution clock ($now, Date.now()); values months in the past get silently filtered out, and HTTP mocks generated later use the same anchors, so stale years make "stored matches current" comparisons impossible. When the data description mentions a relative window ("last 24 hours", "past 2 weeks"), place timestamps safely INSIDE it, never on the boundary.
7. AI root nodes (Agent/Chain) have NODE-TYPE-SPECIFIC output shapes — follow each node's schema or "AI ROOT OUTPUT SHAPE" instruction exactly and never invent a different envelope key. Summary: agent wraps in { "output": ... } (a parsed object matching the parser schema when one is attached, otherwise a plain text string — never a JSON-encoded string); chainLlm uses { "text": "<string>" } without a parser, or { "output": <parsed object> } like agent when a parser is attached; chainRetrievalQa uses { "response": "<string>" }; chainSummarization uses { "output": { "output_text": "<summary>" } }; informationExtractor wraps the extracted fields in { "output": <object> }; textClassifier passes the input item through unchanged; sentimentAnalysis is the input item plus a "sentimentAnalysis" object.
8. CRITICAL: If a "Test Scenario" section is provided, it is the authoritative test state and OVERRIDES everything else, including the general data context and your own sense of realism. When it describes stored/previous records (e.g. "the store already holds a record with status X"), exact values, counts, literal substrings, or that stored data matches current data, reproduce those constraints EXACTLY — never substitute more "interesting" or more typical data. A boring no-change/empty/matching case is usually the point of the test.
9. Return ONLY a valid JSON object, no explanation or markdown fencing.
10. CRITICAL: You MUST generate data for EVERY node listed in "Nodes Requiring Mock Data". Never skip a node, even if the test scenario describes an empty or error response. An empty response is still valid data.`;

const MAX_EMBEDDED_SCHEMA_CHARS = 3000;

/**
 * Render one node's schema/AI-root prompt section (without the heading).
 * Exported separately so the in-product simulation fixture prompt can embed
 * per-node schema guidance without adopting the full pin-data prompt.
 */
export function buildNodeSchemaSection(ctx: NodeSchemaContext): string[] {
	const lines: string[] = [];

	if (ctx.resource || ctx.operation) {
		const parts: string[] = [];
		if (ctx.resource) parts.push(`Resource: ${ctx.resource}`);
		if (ctx.operation) parts.push(`Operation: ${ctx.operation}`);
		lines.push(`- ${parts.join(' | ')}`);
	}

	const isAiRoot = isAiRootNodeType(ctx.nodeType);
	if (isAiRoot) {
		// Roots with a `__schema__` shape (including `with-parser` variants) are
		// covered by the schema section below; the prose is for shapes that can't
		// be files (see `describeAiRootShape`) and the no-schema fallback.
		if (!ctx.schema) {
			lines.push(`- AI ROOT OUTPUT SHAPE: every item MUST be ${describeAiRootShape(ctx.nodeType)}`);
		}
		if (ctx.outputParser?.schemaText) {
			const envelopeKey = findEnvelopeKey(ctx.schema);
			const target = envelopeKey ? `The \`${envelopeKey}\` object` : 'The top-level `json` fields';
			const label = ctx.outputParser.schemaIsExample
				? `- ${target} must have the same shape and field names as this example:`
				: `- ${target} must conform to this JSON Schema (use its exact field names):`;
			const schemaStr = ctx.outputParser.schemaText;
			const truncated =
				schemaStr.length > MAX_EMBEDDED_SCHEMA_CHARS
					? schemaStr.slice(0, MAX_EMBEDDED_SCHEMA_CHARS) + '\n...'
					: schemaStr;
			lines.push(label);
			lines.push('```json');
			lines.push(truncated);
			lines.push('```');
		}
	}

	if (ctx.schema) {
		const schemaStr = JSON.stringify(ctx.schema, null, 2);
		const truncated =
			schemaStr.length > MAX_EMBEDDED_SCHEMA_CHARS
				? schemaStr.slice(0, MAX_EMBEDDED_SCHEMA_CHARS) + '\n...'
				: schemaStr;
		lines.push('- Output JSON Schema:');
		lines.push('```json');
		lines.push(truncated);
		lines.push('```');
	} else if (!isAiRoot) {
		lines.push('(no schema available — generate based on API knowledge)');
	}

	return lines;
}

export interface BuildPinDataUserPromptOptions {
	instructions?: PinDataGenerationInstructions;
	/**
	 * Pre-rendered "## Date anchors" block content (see `buildDateAnchors`).
	 * Injected so this module never reads the clock itself.
	 */
	dateAnchors: string;
}

export function buildPinDataUserPrompt(
	workflow: WorkflowJSON,
	contexts: NodeSchemaContext[],
	options: BuildPinDataUserPromptOptions,
): string {
	const { instructions, dateAnchors } = options;
	const mermaid = workflowToMermaid(workflow);

	const sections: string[] = ['Generate mock output data for service nodes in this workflow.'];

	if (instructions?.dataDescription) {
		sections.push('');
		sections.push('## Data Generation Instructions');
		sections.push('');
		sections.push(instructions.dataDescription);
	}

	if (instructions?.testScenario) {
		sections.push('');
		sections.push('## Test Scenario (authoritative — overrides everything above)');
		sections.push('');
		sections.push(instructions.testScenario);
	}

	sections.push('');
	sections.push('## Workflow Graph');
	sections.push('');
	sections.push('```mermaid');
	sections.push(mermaid);
	sections.push('```');
	sections.push('');
	sections.push('## Nodes Requiring Mock Data');

	for (const ctx of contexts) {
		sections.push('');
		sections.push(`### ${ctx.nodeName} (${ctx.nodeType} v${String(ctx.typeVersion)})`);
		sections.push(...buildNodeSchemaSection(ctx));

		const consumers = collectDownstreamConsumers(workflow, ctx.nodeName);
		if (consumers.length > 0) {
			sections.push('- Direct downstream consumers (emit the exact field names they read):');
			for (const consumer of consumers) {
				sections.push(`  - ${consumer.name} (${consumer.type}): \`${consumer.parameters}\``);
			}
		}
	}

	sections.push('');
	sections.push('## Expected Output Format');
	sections.push('');
	sections.push(
		'Return a JSON object where each key is the exact node name and the value is an array of items, each wrapped in a "json" key:',
	);
	sections.push('');
	sections.push('```json');
	sections.push('{');
	for (let i = 0; i < Math.min(contexts.length, 2); i++) {
		const ctx = contexts[i];
		const comma = i < Math.min(contexts.length, 2) - 1 ? ',' : '';
		sections.push(`  "${ctx.nodeName}": [{ "json": { ... } }]${comma}`);
	}
	if (contexts.length > 2) {
		sections.push('  ...');
	}
	sections.push('}');
	sections.push('```');

	// Anchors go last so they are the freshest context before generation.
	sections.push('');
	sections.push('## Date anchors');
	sections.push(dateAnchors);

	return sections.join('\n');
}
