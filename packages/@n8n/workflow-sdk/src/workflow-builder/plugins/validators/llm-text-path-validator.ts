/**
 * LLM Text Path Validator
 *
 * Flags the common silent failure of reading `$json.text` from vendor LLM
 * nodes whose simplify-on shape uses provider-specific paths (Gemini
 * `content.parts[0].text`, Anthropic `content[0].text`, OpenAI
 * `output[0].content[0].text` / `message.content`).
 *
 * Also flags declared `output` fixtures that invent a flat `{ text }` shape
 * for those nodes — the workflow then verifies green against the mock and
 * fails on the first real run.
 */

import { isRecord } from '@n8n/utils/is-record';

import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const GEMINI = '@n8n/n8n-nodes-langchain.googleGemini';
const ANTHROPIC = '@n8n/n8n-nodes-langchain.anthropic';
const OPENAI = '@n8n/n8n-nodes-langchain.openAi';
const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const JSON_TEXT_FIELD = /\$json\.text\b/;
const NODE_TEXT_FIELD = /\$\(\s*['"][^'"]+['"]\s*\)\.(?:item|first\(\)|last\(\))\.json\.text\b/;

interface LlmHint {
	readonly type: string;
	readonly correctPath: string;
	readonly hasCorrectPath: (source: string) => boolean;
}

const LLM_HINTS: readonly LlmHint[] = [
	{
		type: GEMINI,
		correctPath:
			'$json.content.parts[0].text (or $json.mergedResponse when Include Merged Response is on)',
		hasCorrectPath: (source) =>
			source.includes('$json.content') ||
			source.includes('.json.content') ||
			source.includes('mergedResponse'),
	},
	{
		type: ANTHROPIC,
		correctPath:
			'$json.content[0].text (or $json.merged_response when Include Merged Response is on)',
		hasCorrectPath: (source) =>
			source.includes('$json.content') ||
			source.includes('.json.content') ||
			source.includes('merged_response'),
	},
	{
		type: OPENAI,
		correctPath: '$json.output[0].content[0].text (v2+) or $json.message.content (v1)',
		hasCorrectPath: (source) =>
			source.includes('$json.output') ||
			source.includes('.json.output') ||
			source.includes('$json.message') ||
			source.includes('.json.message'),
	},
];

function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
		return (target as { node: { name?: string } }).node?.name;
	}
	if (isNodeChain(target)) {
		return target.head.name;
	}
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}
	return undefined;
}

function mainInputSources(targetName: string, nodes: ReadonlyMap<string, GraphNode>): string[] {
	const sources: string[] = [];
	for (const [sourceName, graphNode] of nodes) {
		const mainConns = graphNode.connections.get('main');
		if (mainConns) {
			for (const [_outputIndex, targets] of mainConns) {
				for (const target of targets) {
					if (target.node === targetName) {
						sources.push(sourceName);
					}
				}
			}
		}
		if (typeof graphNode.instance.getConnections === 'function') {
			for (const conn of graphNode.instance.getConnections()) {
				if (resolveTargetNodeName(conn.target) === targetName) {
					sources.push(sourceName);
				}
			}
		}
	}
	return [...new Set(sources)];
}

function isSimplifyOn(parameters: Record<string, unknown>): boolean {
	return parameters.simplify !== false;
}

function isTextMessageOperation(parameters: Record<string, unknown>): boolean {
	const resource = parameters.resource;
	const operation = parameters.operation;
	// Vendor LLM text/message is the common case; omit resource/op → treat as text-like.
	if (resource === undefined && operation === undefined) return true;
	if (resource === 'text' || resource === 'message' || resource === undefined) {
		return operation === 'message' || operation === 'response' || operation === undefined;
	}
	return false;
}

function hintForNode(node: NodeInstance<string, string, unknown>): LlmHint | undefined {
	const hint = LLM_HINTS.find((entry) => entry.type === node.type);
	if (!hint) return undefined;
	const params = node.config?.parameters;
	if (!isRecord(params)) return hint;
	if (!isSimplifyOn(params) || !isTextMessageOperation(params)) return undefined;
	// Structured JSON output is not the chat-text shape — skip path heuristics.
	if (params.jsonOutput === true) return undefined;
	return hint;
}

function usesJsonTextWithoutCorrectPath(source: string, hint: LlmHint): boolean {
	if (!JSON_TEXT_FIELD.test(source) && !NODE_TEXT_FIELD.test(source)) {
		return false;
	}
	return !hint.hasCorrectPath(source);
}

function unwrapItemJson(item: Record<string, unknown>): Record<string, unknown> {
	if ('json' in item && isRecord(item.json)) {
		return item.json;
	}
	return item;
}

function hasFlatTextOnlyFixture(shape: Record<string, unknown>): boolean {
	return 'text' in shape && !('content' in shape) && !('output' in shape) && !('message' in shape);
}

/**
 * Validator for common LLM text-path mistakes.
 */
export const llmTextPathValidator: ValidatorPlugin = {
	id: 'core:llm-text-path',
	name: 'LLM Text Path Validator',
	priority: 35,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const hint = hintForNode(node);
		if (!hint) return [];

		const output = node.config?.output;
		if (!output || output.length === 0) return [];
		const first = output[0];
		if (!isRecord(first)) return [];
		const shape = unwrapItemJson(first);
		if (!hasFlatTextOnlyFixture(shape)) return [];

		return [
			{
				code: 'WRONG_LLM_OUTPUT_FIXTURE',
				message:
					`'${node.name}' declares a flat \`{ text }\` output fixture, but ${hint.type} with simplify on ` +
					`emits ${hint.correctPath}. Coding against this mock self-verifies green and fails on the first real run. ` +
					'Update the declared output to the provider shape (or enable Include Merged Response and use that field).',
				severity: 'warning',
				violationLevel: 'major',
				nodeName: node.name,
				parameterPath: 'output',
			},
		];
	},

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		for (const [mapKey, graphNode] of ctx.nodes) {
			const params = graphNode.instance.config?.parameters;
			if (!isRecord(params)) continue;

			const predecessors = mainInputSources(mapKey, ctx.nodes);
			const llmParents = predecessors
				.map((name) => {
					const parent = ctx.nodes.get(name);
					if (!parent) return undefined;
					const hint = hintForNode(parent.instance);
					return hint ? { name, hint } : undefined;
				})
				.filter((entry): entry is { name: string; hint: LlmHint } => entry !== undefined);

			if (llmParents.length === 0) continue;

			const expressionSources = extractExpressions(params).map((entry) => ({
				source: entry.expression,
				parameterPath: entry.path,
			}));

			if (
				graphNode.instance.type === CODE_NODE_TYPE &&
				typeof params.jsCode === 'string' &&
				params.jsCode.length > 0
			) {
				expressionSources.push({ source: params.jsCode, parameterPath: 'jsCode' });
			}

			for (const { name: parentName, hint } of llmParents) {
				for (const { source, parameterPath } of expressionSources) {
					if (!usesJsonTextWithoutCorrectPath(source, hint)) continue;
					issues.push({
						code: 'WRONG_LLM_TEXT_PATH',
						message:
							`'${mapKey}' parameter '${parameterPath}' reads $json.text from upstream LLM '${parentName}', ` +
							`but ${hint.type} with simplify on exposes text at ${hint.correctPath} — not $json.text. ` +
							'Update the path (or use Include Merged Response) before wiring more nodes.',
						severity: 'warning',
						violationLevel: 'major',
						nodeName: mapKey,
						parameterPath,
					});
				}
			}
		}

		return issues;
	},
};
