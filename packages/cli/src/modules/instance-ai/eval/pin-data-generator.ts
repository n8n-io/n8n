/**
 * LLM-based pin data generator.
 *
 * Generates realistic mock output data for specified nodes in a workflow
 * via a single LLM call, ensuring cross-node data consistency. The caller
 * decides which nodes need pin data — this module only generates it.
 *
 * Thin wrapper: prompt building, response parsing, and envelope repair live
 * in `@n8n/workflow-sdk` (`mock-data/`), shared with the ai-workflow-builder
 * evals and in-product simulated verification. This module contributes the
 * LLM call (`createEvalAgent`) and the `__schema__` lookup wiring.
 */

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import type {
	WorkflowJSON,
	OutputSchemaLookup,
	PinDataGenerationInstructions,
} from '@n8n/workflow-sdk';
import {
	buildDateAnchors,
	buildPinDataUserPrompt,
	buildSchemaContexts,
	findOutputParserTargets,
	parsePinDataResponse,
	PIN_DATA_SYSTEM_PROMPT,
	repairStructuredOutput,
} from '@n8n/workflow-sdk';
import { OperationalError } from 'n8n-workflow';

// Re-exports: existing consumers/tests import these from this module.
export { findOutputParserTargets, repairStructuredOutput } from '@n8n/workflow-sdk';

type PinData = Record<string, Array<Record<string, unknown>>>;

/**
 * Hang guard for the pin-data LLM call. A stalled provider call otherwise
 * eats the scenario execution budget; aborting lets the caller fall back to
 * empty pin data instead.
 */
const PIN_DATA_LLM_TIMEOUT_MS = 180_000;

export interface GeneratePinDataOptions {
	/** The workflow containing the nodes to generate data for */
	workflow: WorkflowJSON;
	/** Node names to generate pin data for */
	nodeNames: string[];
	/** Optional instructions to enrich the LLM prompt */
	instructions?: PinDataGenerationInstructions;
	/**
	 * `__schema__` lookup (`LoadNodesAndCredentials.createOutputSchemaLookup()`).
	 * Absent lookup degrades to API-knowledge-only generation.
	 */
	outputSchemaLookup?: OutputSchemaLookup;
}

/**
 * Generate pin data for specified nodes in a workflow using an LLM.
 * Produces consistent cross-node mock data in a single LLM call.
 *
 * The caller decides which nodes need pin data (via nodeNames).
 * This function only generates it.
 *
 * @returns PinData covering every requested node (empty array = valid "no stored data" pin).
 * @throws when generation fails or a node is missing — a silently unpinned node runs for real.
 */
export async function generatePinData(options: GeneratePinDataOptions): Promise<PinData> {
	const { workflow, nodeNames, instructions, outputSchemaLookup } = options;

	if (nodeNames.length === 0) return {};

	// Resolve target nodes from the workflow
	const targetNodes = workflow.nodes.filter((n) => n.name && nodeNames.includes(n.name));
	if (targetNodes.length === 0) return {};

	// Build schema contexts with optional __schema__ enrichment and
	// structured-output-parser envelopes for AI roots
	const outputParserTargets = findOutputParserTargets(workflow);
	const contexts = buildSchemaContexts(targetNodes, outputSchemaLookup, outputParserTargets);

	// Build prompt and call LLM
	const userPrompt = buildPinDataUserPrompt(workflow, contexts, {
		instructions,
		dateAnchors: buildDateAnchors(new Date()),
	});
	const expectedNodeNames = contexts.map((c) => c.nodeName);

	const agent = createEvalAgent('eval-pin-data-generator', {
		instructions: PIN_DATA_SYSTEM_PROMPT,
		cache: true,
	});

	const result = await agent.generate(userPrompt, {
		providerOptions: { anthropic: { maxTokens: 16_384 } },
		abortSignal: AbortSignal.timeout(PIN_DATA_LLM_TIMEOUT_MS),
	});

	const responseText = extractText(result);
	const pinData = parsePinDataResponse(responseText, expectedNodeNames);

	const missing = expectedNodeNames.filter((name) => !(name in pinData));
	if (missing.length > 0) {
		throw new OperationalError(
			`Pin data generation returned no data for node(s): ${missing.join(', ')}`,
		);
	}

	// Envelope repair for parser-target roots; the shared helper derives the
	// envelope key from each root's with-parser `__schema__` variant
	// (`output` for both agent and chainLlm).
	return repairStructuredOutput(pinData, workflow, contexts);
}
