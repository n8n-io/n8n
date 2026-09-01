/**
 * LLM-based pin data generator for evaluations.
 *
 * Generates realistic mock output data for service nodes in a workflow
 * via a single LLM call, ensuring cross-node data consistency.
 * Works with both the code-based and multi-agent builder outputs.
 *
 * Thin wrapper: prompt building, `__schema__` contexts, response parsing,
 * and envelope repair live in `@n8n/workflow-sdk` (`mock-data/`), shared
 * with the instance-ai eval pipeline and in-product simulated verification.
 * This module contributes the eval-context node-eligibility policy and the
 * LangChain LLM call.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type {
	NodeJSON,
	NodeSchemaContext,
	OutputSchemaLookup,
	WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	buildDateAnchors,
	buildPinDataUserPrompt,
	buildSchemaContexts as buildSchemaContextsShared,
	findOutputParserTargets,
	parsePinDataResponse,
	PIN_DATA_SYSTEM_PROMPT,
	repairStructuredOutput,
	workflowToMermaid as workflowToMermaidShared,
} from '@n8n/workflow-sdk';
import {
	findAiRootNodeNames,
	type INode,
	type INodeTypeDescription,
	type IPinData,
} from 'n8n-workflow';

import type { SimpleWorkflow } from '../../src/types/workflow';
import type { EvalLogger } from '../harness/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PinDataGeneratorOptions {
	/** LLM to use for generating mock data */
	llm: BaseChatModel;
	/** Loaded node type descriptions (from env.parsedNodeTypes) */
	nodeTypes: INodeTypeDescription[];
	/** Optional `__schema__` lookup for shape-enriched pin data */
	outputSchemaLookup?: OutputSchemaLookup;
	/** Logger for verbose output */
	logger?: EvalLogger;
}

/**
 * `SimpleWorkflow` (n8n-workflow types) and `WorkflowJSON` (workflow-sdk)
 * describe the same serialized shape; the nominal mismatch is only in
 * credential details (`id: string | null` vs `id?: string`).
 */
const toWorkflowJSON = (workflow: SimpleWorkflow): WorkflowJSON =>
	workflow as unknown as WorkflowJSON;

// ---------------------------------------------------------------------------
// Utility node deny-list
// ---------------------------------------------------------------------------

/**
 * Nodes that define credentials in their type description but don't actually
 * call external APIs, so they don't need pin data. All other non-service nodes
 * are excluded naturally because they have no credentials defined.
 */
const NON_SERVICE_NODES_WITH_CREDENTIALS = new Set([
	'n8n-nodes-base.wait', // optional webhook-resumption auth
	'n8n-nodes-base.respondToWebhook', // optional JWT signing when responding
]);

// ---------------------------------------------------------------------------
// Node identification
// ---------------------------------------------------------------------------

/**
 * Identify which nodes in a workflow need pin data.
 * In eval context, we pin all service/API nodes since none have real credentials.
 */
export function identifyPinDataNodes(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): INode[] {
	const nodeTypeMap = new Map(nodeTypes.map((nt) => [nt.name, nt]));
	const aiRootNodes = findAiRootNodeNames(workflow.connections);

	return workflow.nodes.filter((node) => {
		// Skip disabled nodes
		if (node.disabled) return false;

		// Pin root AI nodes (Agent, Chain, etc.) — their sub-nodes (tools,
		// memory, LLMs) can't run without real providers in the eval context.
		if (aiRootNodes.has(node.name)) return true;

		// Check if the node type definition has credentials (→ it's a service node)
		const typeDesc = nodeTypeMap.get(node.type);
		if (typeDesc?.credentials && typeDesc.credentials.length > 0) {
			// Exclude nodes that define credentials for local/optional auth, not external APIs
			return !NON_SERVICE_NODES_WITH_CREDENTIALS.has(node.type);
		}

		// Nodes that require infrastructure unavailable in the eval context:
		// - HTTP/Webhook: optional credentials, may call external APIs
		// - DataTable: requires the data-table module
		// - Code/ExecuteCommand: require a task runner to execute
		if (
			node.type === 'n8n-nodes-base.httpRequest' ||
			node.type === 'n8n-nodes-base.webhook' ||
			node.type === 'n8n-nodes-base.dataTable' ||
			node.type === 'n8n-nodes-base.code' ||
			node.type === 'n8n-nodes-base.executeCommand'
		) {
			return true;
		}

		return false;
	});
}

// ---------------------------------------------------------------------------
// Shared-module adapters (INode/SimpleWorkflow-typed entry points)
// ---------------------------------------------------------------------------

/**
 * Build schema context for all pin-data-eligible nodes.
 */
export function buildSchemaContexts(
	nodes: INode[],
	outputSchemaLookup?: OutputSchemaLookup,
): NodeSchemaContext[] {
	return buildSchemaContextsShared(nodes as unknown as NodeJSON[], outputSchemaLookup);
}

/**
 * Convert a workflow's nodes and connections to a mermaid flowchart string.
 * Includes node type, version, resource, and operation info in labels.
 */
export function workflowToMermaid(workflow: SimpleWorkflow): string {
	return workflowToMermaidShared(toWorkflowJSON(workflow));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate pin data for all service nodes in a workflow using an LLM.
 * Produces consistent cross-node mock data in a single LLM call.
 *
 * @returns IPinData map (node name → execution data items). Returns {} on failure.
 */
export async function generateEvalPinData(
	workflow: SimpleWorkflow,
	options: PinDataGeneratorOptions,
): Promise<IPinData> {
	const { llm, nodeTypes, outputSchemaLookup, logger } = options;

	// 1. Identify which nodes need pin data
	const eligibleNodes = identifyPinDataNodes(workflow, nodeTypes);
	if (eligibleNodes.length === 0) {
		logger?.verbose('  Pin data: no service nodes found, skipping');
		return {};
	}

	logger?.verbose(`  Pin data: generating for ${eligibleNodes.length} node(s)`);

	// 2. Build schema contexts (with optional __schema__ enrichment and
	//    structured-output-parser envelopes for AI roots)
	const workflowJson = toWorkflowJSON(workflow);
	const outputParserTargets = findOutputParserTargets(workflowJson);
	const contexts = buildSchemaContextsShared(
		eligibleNodes as unknown as NodeJSON[],
		outputSchemaLookup,
		outputParserTargets,
	);
	const schemasFound = contexts.filter((c) => c.schema).length;
	if (schemasFound > 0) {
		logger?.verbose(`  Pin data: found __schema__ for ${schemasFound}/${contexts.length} node(s)`);
	}

	// 3. Build prompt and call LLM
	const userPrompt = buildPinDataUserPrompt(workflowJson, contexts, {
		dateAnchors: buildDateAnchors(new Date()),
	});
	const expectedNodeNames = contexts.map((c) => c.nodeName);

	try {
		const response = await llm.invoke([
			new SystemMessage(PIN_DATA_SYSTEM_PROMPT),
			new HumanMessage(userPrompt),
		]);

		const responseText =
			typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

		const pinData = parsePinDataResponse(responseText, expectedNodeNames);

		// Envelope repair for parser-target roots; the shared helper derives the
		// envelope key from each root's with-parser `__schema__` variant
		// (`output` for both agent and chainLlm).
		const repaired = repairStructuredOutput(pinData, workflowJson, contexts);

		const generatedCount = Object.keys(repaired).length;
		logger?.verbose(
			`  Pin data: generated for ${generatedCount}/${expectedNodeNames.length} node(s)`,
		);

		return repaired as IPinData;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger?.warn(`  Pin data generation failed: ${message}`);
		return {};
	}
}
