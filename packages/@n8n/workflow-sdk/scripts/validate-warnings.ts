/**
 * Script to validate warnings for workflows in SKIP_VALIDATION_WORKFLOWS
 * Checks if each warning is legitimate (exists in original) or a codegen bug
 *
 * Run: npx ts-node scripts/validate-warnings.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateWorkflowCode } from '../src/codegen/index';
import { parseWorkflowCodeToBuilder } from '../src/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

// Workflows that are completely skipped (not just validation-skipped)
const SKIP_WORKFLOWS = new Set<string>(['5979']);

// Workflows to skip validation due to known codegen bugs (invalid warnings)
// These produce warnings that don't exist in the original workflow (codegen issues to fix)
// Once fixed, these should be moved to expectedWarnings in manifest.json
// NOTE: All previous workflows have been fixed and moved to expectedWarnings in manifests
const SKIP_VALIDATION_WORKFLOWS = new Set<string>([
	// Currently empty - all codegen bugs have been fixed!
]);

interface Warning {
	code: string;
	message: string;
	nodeName?: string;
}

interface ValidationResult {
	workflowId: string;
	workflowName: string;
	validWarnings: Warning[];
	invalidWarnings: Warning[];
	error?: string;
}

// Helper to check if a node type is a trigger
function isTriggerNode(type: string): boolean {
	return (
		type.includes('Trigger') ||
		type.includes('trigger') ||
		type.includes('Webhook') ||
		type.includes('webhook') ||
		type.includes('Schedule') ||
		type.includes('schedule') ||
		type.includes('Poll') ||
		type.includes('poll')
	);
}

// AI connection types used by subnodes
const AI_CONNECTION_TYPES = [
	'ai_languageModel',
	'ai_memory',
	'ai_tool',
	'ai_outputParser',
	'ai_embedding',
	'ai_vectorStore',
	'ai_retriever',
	'ai_document',
	'ai_textSplitter',
	'ai_reranker',
];

/**
 * Check if a node has AI connections to a parent node (making it a connected subnode)
 */
function hasAiConnectionToParent(nodeName: string, json: WorkflowJSON): boolean {
	const nodeConnections = json.connections[nodeName];
	if (!nodeConnections) return false;

	for (const connType of AI_CONNECTION_TYPES) {
		const aiConns = nodeConnections[connType as keyof typeof nodeConnections];
		if (aiConns && Array.isArray(aiConns)) {
			for (const outputs of aiConns) {
				if (outputs && outputs.length > 0) {
					return true;
				}
			}
		}
	}
	return false;
}

/**
 * Check if a node has incoming main connections in the original JSON
 * Only counts connections from nodes that actually exist in the workflow
 */
function hasIncomingConnections(json: WorkflowJSON, nodeName: string): boolean {
	for (const [sourceName, nodeConnections] of Object.entries(json.connections)) {
		// Only count connections from nodes that actually exist
		const sourceExists = json.nodes.some((n) => n.name === sourceName);
		if (!sourceExists) {
			continue; // Skip connections from non-existent nodes (malformed workflow JSON)
		}

		if (nodeConnections.main) {
			for (const outputs of nodeConnections.main) {
				if (outputs) {
					for (const connection of outputs) {
						if (connection.node === nodeName) {
							return true;
						}
					}
				}
			}
		}
	}
	return false;
}

/**
 * Check if a node is disconnected in the original JSON
 */
function isNodeDisconnectedInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	const node = json.nodes.find((n) => n.name === nodeName);
	if (!node) return false;

	// Triggers don't need incoming connections
	if (isTriggerNode(node.type)) return false;

	// Sticky notes are never "disconnected"
	if (node.type === 'n8n-nodes-base.stickyNote') return false;

	// Subnodes connected via AI connections are not disconnected
	if (hasAiConnectionToParent(nodeName, json)) return false;

	// Check if the node has any incoming connections in the original
	return !hasIncomingConnections(json, nodeName);
}

/**
 * Check if an agent has a static prompt (no expression) in the original JSON
 */
function hasStaticPromptInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	const node = json.nodes.find((n) => n.name === nodeName);
	if (!node) return false;

	const params = node.parameters as Record<string, unknown> | undefined;
	if (!params) return true; // No parameters = static

	const text = params.text as string | undefined;
	if (!text) return true; // No text = static

	// Check if text contains expressions (={{ or just {{)
	// Note: {{ without = is technically wrong but indicates intent to use expression
	return !text.includes('={{') && !text.includes('{{');
}

/**
 * Check if an agent has no system message in the original JSON
 */
function hasNoSystemMessageInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	const node = json.nodes.find((n) => n.name === nodeName);
	if (!node) return false;

	const params = node.parameters as Record<string, unknown> | undefined;
	if (!params) return true;

	const options = params.options as Record<string, unknown> | undefined;
	if (!options) return true;

	const systemMessage = options.systemMessage as string | undefined;
	return !systemMessage || systemMessage.trim() === '';
}

/**
 * Check if a merge node has fewer than 2 inputs in the original JSON
 */
function hasSingleInputMergeInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	// Count incoming connections to different input indices
	const inputIndices = new Set<number>();

	for (const [_sourceName, nodeConnections] of Object.entries(json.connections)) {
		if (nodeConnections.main) {
			for (const outputs of nodeConnections.main) {
				if (outputs) {
					for (const connection of outputs) {
						if (connection.node === nodeName) {
							inputIndices.add(connection.index || 0);
						}
					}
				}
			}
		}
	}

	return inputIndices.size < 2;
}

/**
 * Check if a tool has no parameters in the original JSON
 */
function hasNoToolParametersInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	const node = json.nodes.find((n) => n.name === nodeName);
	if (!node) return false;

	const params = node.parameters as Record<string, unknown> | undefined;
	if (!params) return true;

	// Check if parameters is empty or has only default values
	return Object.keys(params).length === 0;
}

/**
 * Pattern to detect {{ }} containing n8n variables without = prefix.
 * Matches: {{ $json }}, {{ $env.X }}, {{ $('Node') }}, {{ JSON.stringify($json) }}, etc.
 * Does NOT match: ={{ $json }} (has prefix) or {{ someVar }} (no $ variable)
 * Must match the pattern in workflow-builder.ts to correctly identify valid warnings.
 */
const MISSING_EXPR_PREFIX_PATTERN =
	/(?<!=)\{\{[^}]*\$(?:json|input|binary|env|vars|secrets|now|today|execution|workflow|node|prevNode|item|itemIndex|runIndex|position|\()[^}]*\}\}/;

/**
 * Check if a value contains a missing expression prefix in the original JSON
 */
function hasMissingExpressionPrefixInOriginal(json: WorkflowJSON, nodeName: string): boolean {
	const node = json.nodes.find((n) => n.name === nodeName);
	if (!node) return false;

	const checkForMissingPrefix = (value: unknown): boolean => {
		if (typeof value === 'string') {
			// Check for {{ $json... }}, {{ JSON.stringify($json) }}, etc. without leading =
			// Use the same pattern as workflow-builder.ts for consistency
			if (!value.startsWith('=') && MISSING_EXPR_PREFIX_PATTERN.test(value)) {
				return true;
			}
		} else if (Array.isArray(value)) {
			return value.some(checkForMissingPrefix);
		} else if (value && typeof value === 'object') {
			return Object.values(value).some(checkForMissingPrefix);
		}
		return false;
	};

	return checkForMissingPrefix(node.parameters);
}

/**
 * Validate if a warning is legitimate (exists in original workflow)
 */
function isWarningValid(warning: Warning, originalJson: WorkflowJSON): boolean {
	const nodeName = warning.nodeName;

	switch (warning.code) {
		case 'DISCONNECTED_NODE':
			// Valid if node has no incoming connections in original
			if (!nodeName) return false;
			return isNodeDisconnectedInOriginal(originalJson, nodeName);

		case 'AGENT_STATIC_PROMPT':
			// Valid if original agent has no expression in prompt
			if (!nodeName) return false;
			return hasStaticPromptInOriginal(originalJson, nodeName);

		case 'AGENT_NO_SYSTEM_MESSAGE':
			// Valid if original agent has no/empty system message
			if (!nodeName) return false;
			return hasNoSystemMessageInOriginal(originalJson, nodeName);

		case 'MERGE_SINGLE_INPUT':
			// Valid if original merge has <2 inputs
			if (!nodeName) return false;
			return hasSingleInputMergeInOriginal(originalJson, nodeName);

		case 'TOOL_NO_PARAMETERS':
			// Valid if tool has no parameters in original
			if (!nodeName) return false;
			return hasNoToolParametersInOriginal(originalJson, nodeName);

		case 'MISSING_EXPRESSION_PREFIX':
			// Valid if original has {{ $json }} without = prefix
			if (!nodeName) return false;
			return hasMissingExpressionPrefixInOriginal(originalJson, nodeName);

		case 'MISSING_TRIGGER':
			// Valid if original has no trigger node
			return !originalJson.nodes.some((node) => isTriggerNode(node.type));

		default:
			// Unknown warning type - assume it's valid
			return true;
	}
}

/**
 * Process a single workflow
 */
function processWorkflow(id: string, json: WorkflowJSON): ValidationResult {
	const result: ValidationResult = {
		workflowId: id,
		workflowName: json.name || 'Unknown',
		validWarnings: [],
		invalidWarnings: [],
	};

	try {
		// Generate TypeScript code
		const code = generateWorkflowCode(json);

		// Parse back to builder
		const builder = parseWorkflowCodeToBuilder(code);

		// Validate
		const validationResult = builder.validate();

		// Classify each warning
		for (const warning of validationResult.warnings) {
			const warningObj: Warning = {
				code: warning.code,
				message: warning.message,
				nodeName: warning.nodeName,
			};

			if (isWarningValid(warningObj, json)) {
				result.validWarnings.push(warningObj);
			} else {
				result.invalidWarnings.push(warningObj);
			}
		}
	} catch (error) {
		result.error = error instanceof Error ? error.message : String(error);
	}

	return result;
}

/**
 * Main script
 */
async function main() {
	const fixturesDir = path.join(__dirname, '..', 'test-fixtures');
	const committedDir = path.join(fixturesDir, 'committed-workflows');
	const downloadedDir = path.join(fixturesDir, 'real-workflows');

	const results: ValidationResult[] = [];
	const summary = {
		totalWorkflows: 0,
		workflowsWithOnlyValidWarnings: 0,
		workflowsWithInvalidWarnings: 0,
		workflowsWithErrors: 0,
		workflowsWithNoWarnings: 0,
	};

	// Process workflows from both directories
	for (const [dir, _name] of [
		[committedDir, 'committed'],
		[downloadedDir, 'real'],
	] as const) {
		const manifestPath = path.join(dir, 'manifest.json');
		if (!fs.existsSync(manifestPath)) {
			console.error(`Manifest not found: ${manifestPath}`);
			continue;
		}

		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

		for (const entry of manifest.workflows) {
			const id = String(entry.id);

			// Only process workflows in SKIP_VALIDATION_WORKFLOWS
			if (!SKIP_VALIDATION_WORKFLOWS.has(id)) continue;

			// Skip workflows that are completely skipped
			if (SKIP_WORKFLOWS.has(id)) continue;

			const filePath = path.join(dir, `${id}.json`);
			if (!fs.existsSync(filePath)) {
				console.error(`Workflow file not found: ${filePath}`);
				continue;
			}

			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;
			const result = processWorkflow(id, json);
			results.push(result);

			summary.totalWorkflows++;
			if (result.error) {
				summary.workflowsWithErrors++;
			} else if (result.validWarnings.length === 0 && result.invalidWarnings.length === 0) {
				summary.workflowsWithNoWarnings++;
			} else if (result.invalidWarnings.length > 0) {
				summary.workflowsWithInvalidWarnings++;
			} else {
				summary.workflowsWithOnlyValidWarnings++;
			}
		}
	}

	// Separate valid and invalid workflows
	const validWorkflows = results.filter((r) => !r.error && r.invalidWarnings.length === 0);
	const invalidWorkflows = results.filter((r) => !r.error && r.invalidWarnings.length > 0);
	const errorWorkflows = results.filter((r) => r.error);

	// Output report
	const report = {
		summary,
		validWorkflows: validWorkflows.map((r) => ({
			id: r.workflowId,
			name: r.workflowName,
			warnings: r.validWarnings.map((w) => ({
				code: w.code,
				nodeName: w.nodeName,
			})),
		})),
		invalidWorkflows: invalidWorkflows.map((r) => ({
			id: r.workflowId,
			name: r.workflowName,
			validWarnings: r.validWarnings.map((w) => ({
				code: w.code,
				nodeName: w.nodeName,
			})),
			invalidWarnings: r.invalidWarnings.map((w) => ({
				code: w.code,
				nodeName: w.nodeName,
				message: w.message,
			})),
		})),
		errorWorkflows: errorWorkflows.map((r) => ({
			id: r.workflowId,
			name: r.workflowName,
			error: r.error,
		})),
	};

	console.log(JSON.stringify(report, null, 2));

	// Generate expectedWarnings format for valid workflows (to be added to manifest)
	console.error('\n\n=== EXPECTED WARNINGS FOR MANIFEST ===\n');
	console.error('// Add this to each workflow entry in manifest.json:\n');
	for (const r of validWorkflows) {
		if (r.validWarnings.length > 0) {
			const expectedWarnings = r.validWarnings.map((w) => {
				const obj: { code: string; nodeName?: string } = { code: w.code };
				if (w.nodeName) obj.nodeName = w.nodeName;
				return obj;
			});
			console.error(`"${r.workflowId}": ${JSON.stringify({ expectedWarnings })},`);
		}
	}

	// List workflow IDs that should remain in SKIP_VALIDATION_WORKFLOWS
	console.error('\n\n=== WORKFLOWS TO KEEP IN SKIP_VALIDATION_WORKFLOWS (codegen bugs) ===\n');
	const invalidIds = invalidWorkflows
		.map((r) => r.workflowId)
		.sort((a, b) => parseInt(a) - parseInt(b));
	console.error(invalidIds.join(', '));

	// List workflow IDs that can be removed from SKIP_VALIDATION_WORKFLOWS
	console.error('\n\n=== WORKFLOWS TO REMOVE FROM SKIP_VALIDATION_WORKFLOWS ===\n');
	const validIds = validWorkflows
		.map((r) => r.workflowId)
		.sort((a, b) => parseInt(a) - parseInt(b));
	console.error(validIds.join(', '));
}

main().catch(console.error);
