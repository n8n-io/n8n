/**
 * LLM Text Path Validator
 *
 * Flags the common silent failures of reading a vendor LLM node's output:
 * `$json.text` where the node uses a provider-specific path (Gemini
 * `content.parts[0].text`, Anthropic `content[0].text`, OpenAI
 * `output[0].content[0].text` / `message.content`), and defensive fallback
 * chains (`x.content || x.text || x.output`) that guess at the shape instead of
 * reading it. A guessed chain does not fail loudly — it lands in the catch
 * branch and ships a workflow that quietly produces empty results.
 *
 * Guidance is keyed by the same layout variant the node's `__schema__` files
 * are keyed by (`resolveOutputSchemaVariant`), so structured output and
 * simplify-off get their own correct paths rather than being skipped.
 *
 * Also flags declared `output` fixtures that invent a flat `{ text }` shape
 * for those nodes — the workflow then verifies green against the mock and
 * fails on the first real run.
 */

import { isRecord } from '@n8n/utils/is-record';
import {
	RAW_OUTPUT_SCHEMA_VARIANT,
	resolveOutputSchemaVariant,
	STRUCTURED_OUTPUT_SCHEMA_VARIANT,
} from 'n8n-workflow';

import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const GEMINI = '@n8n/n8n-nodes-langchain.googleGemini';
const ANTHROPIC = '@n8n/n8n-nodes-langchain.anthropic';
const OPENAI = '@n8n/n8n-nodes-langchain.openAi';
const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const JSON_TEXT_FIELD = /\$json\.text\b/;
const NODE_TEXT_FIELD = /\$\(\s*['"][^'"]+['"]\s*\)\.(?:item|first\(\)|last\(\))\.json\.text\b/;

/**
 * Two reads of the SAME base expression under `||`, differing only in which
 * output-ish field they pick — e.g. `aiOutput.content || aiOutput.text`. That is
 * a guess about the node's shape, not a fallback for missing data.
 */
const GUESSED_FIELD_CHAIN =
	/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.(content|text|output|message|response)\s*\|\|\s*\1\.(content|text|output|message|response)/;

const JSON_PARSE_CALL = /\bJSON\.parse\s*\(/;

interface LlmShapeHint {
	/** Correct path for this layout. */
	readonly correctPath: string;
	/** True when the source already reads the right place. */
	readonly hasCorrectPath: (source: string) => boolean;
}

interface LlmHint extends LlmShapeHint {
	readonly type: string;
	/** True when the node already parsed the text, so `JSON.parse` on it is wrong. */
	readonly textAlreadyParsed: boolean;
}

interface LlmShapes {
	readonly base: LlmShapeHint;
	readonly structured?: LlmShapeHint;
	readonly raw?: LlmShapeHint;
}

const readsContent = (source: string) =>
	source.includes('$json.content') || source.includes('.json.content');

const LLM_SHAPES: Readonly<Record<string, LlmShapes>> = {
	[GEMINI]: {
		base: {
			correctPath:
				'$json.content.parts[0].text (or $json.mergedResponse when Include Merged Response is on)',
			hasCorrectPath: (source) => readsContent(source) || source.includes('mergedResponse'),
		},
	},
	[ANTHROPIC]: {
		base: {
			correctPath:
				'$json.content[0].text (or $json.merged_response when Include Merged Response is on)',
			hasCorrectPath: (source) => readsContent(source) || source.includes('merged_response'),
		},
	},
	[OPENAI]: {
		base: {
			correctPath: '$json.output[0].content[0].text (v2+) or $json.message.content (v1)',
			hasCorrectPath: (source) =>
				source.includes('$json.output') ||
				source.includes('.json.output') ||
				source.includes('$json.message') ||
				source.includes('.json.message'),
		},
		structured: {
			correctPath:
				'$json.output[0].content[0].text (v2+) or $json.message.content (v1) — already a parsed OBJECT, not a JSON string',
			hasCorrectPath: (source) =>
				source.includes('$json.output') ||
				source.includes('.json.output') ||
				source.includes('$json.message') ||
				source.includes('.json.message'),
		},
		raw: {
			correctPath:
				"the message item of $json.output (filter for type === 'message', v2+) or $json.choices[0].message.content (v1) — Simplify Output is off, so the item is the full API payload",
			hasCorrectPath: (source) =>
				source.includes('$json.output') ||
				source.includes('.json.output') ||
				source.includes('$json.choices') ||
				source.includes('.json.choices'),
		},
	},
};

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
	const shapes = LLM_SHAPES[node.type];
	if (!shapes) return undefined;

	const params = node.config?.parameters;
	const asHint = (shape: LlmShapeHint, textAlreadyParsed = false): LlmHint => ({
		type: node.type,
		correctPath: shape.correctPath,
		hasCorrectPath: shape.hasCorrectPath,
		textAlreadyParsed,
	});

	if (!isRecord(params)) return asHint(shapes.base);
	if (!isTextMessageOperation(params)) return undefined;

	// Same variant resolution the node's `__schema__` layouts are keyed by, so
	// structured output and simplify-off get their own paths instead of being
	// skipped as "not the chat-text shape".
	const variant = resolveOutputSchemaVariant({ type: node.type, parameters: params });
	if (variant === STRUCTURED_OUTPUT_SCHEMA_VARIANT) {
		return shapes.structured ? asHint(shapes.structured, true) : undefined;
	}
	if (variant === RAW_OUTPUT_SCHEMA_VARIANT) {
		return shapes.raw ? asHint(shapes.raw) : undefined;
	}

	// No variant rule for this node type: stay quiet on configs that reshape the
	// output rather than assert a path we have not verified for this provider.
	if (params.simplify === false || params.jsonOutput === true) return undefined;

	return asHint(shapes.base);
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
					`'${node.name}' declares a flat \`{ text }\` output fixture, but ${hint.type} ` +
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
					if (usesJsonTextWithoutCorrectPath(source, hint)) {
						issues.push({
							code: 'WRONG_LLM_TEXT_PATH',
							message:
								`'${mapKey}' parameter '${parameterPath}' reads $json.text from upstream LLM '${parentName}', ` +
								`but ${hint.type} exposes text at ${hint.correctPath} — not $json.text. ` +
								'Update the path (or use Include Merged Response) before wiring more nodes.',
							severity: 'warning',
							violationLevel: 'major',
							nodeName: mapKey,
							parameterPath,
						});
					}

					if (GUESSED_FIELD_CHAIN.test(source)) {
						issues.push({
							code: 'GUESSED_LLM_OUTPUT_PATH',
							message:
								`'${mapKey}' parameter '${parameterPath}' picks between several fields of the output of upstream LLM ` +
								`'${parentName}' (e.g. \`x.content || x.text\`) instead of reading the one real path, ${hint.correctPath}. ` +
								'The chain resolves to undefined and lands in the error branch, so the workflow ships quietly producing ' +
								'empty results. Call nodes(action="output-schema") for that node and read the exact path.',
							severity: 'warning',
							violationLevel: 'major',
							nodeName: mapKey,
							parameterPath,
						});
					}

					if (hint.textAlreadyParsed && JSON_PARSE_CALL.test(source)) {
						issues.push({
							code: 'REDUNDANT_LLM_OUTPUT_PARSE',
							message:
								`'${mapKey}' parameter '${parameterPath}' calls JSON.parse on the output of upstream LLM ` +
								`'${parentName}', but that node is configured for structured output and has already parsed it — ` +
								`${hint.correctPath}. Parsing again throws (or stringifies an object) and lands in the error branch. ` +
								'Read the value directly.',
							severity: 'warning',
							violationLevel: 'major',
							nodeName: mapKey,
							parameterPath,
						});
					}
				}
			}
		}

		return issues;
	},
};
