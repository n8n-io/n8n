import { ExpressionParser } from 'n8n-workflow';

import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { extractExpressionsFromParams } from '../utils';

const GMAIL_TYPE = 'n8n-nodes-base.gmail';
const GMAIL_TRIGGER_TYPE = 'n8n-nodes-base.gmailTrigger';

const BODY_FIELDS = new Set(['text', 'html', 'textAsHtml', 'payload', 'raw']);
const UNSAFE_V1_FORMATS = new Set(['ids', 'metadata', 'minimal']);

type GmailSafety = 'unsafe' | 'safe' | 'unknown';

function isExpressionString(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

function gmailV2Safety(parameters: Record<string, unknown>, typeVersion: number): GmailSafety {
	const simple = parameters.simple;
	if (isExpressionString(simple)) return 'unknown';
	if (simple === false) return 'safe';
	if (simple === true) return 'unsafe';
	// Missing — depends on the version's default. v2.3+ defaults to false (safe);
	// earlier versions default to true (unsafe).
	return typeVersion >= 2.3 ? 'safe' : 'unsafe';
}

function gmailV1Safety(parameters: Record<string, unknown>): GmailSafety {
	const additionalFields = parameters.additionalFields as Record<string, unknown> | undefined;
	const format = additionalFields?.format;
	if (isExpressionString(format)) return 'unknown';
	if (typeof format !== 'string') return 'safe';
	return UNSAFE_V1_FORMATS.has(format) ? 'unsafe' : 'safe';
}

function getGmailSafety(node: WorkflowNodeResponse): GmailSafety {
	const params = node.parameters ?? {};
	const version = node.typeVersion ?? 1;
	if (node.type === GMAIL_TRIGGER_TYPE) return gmailV2Safety(params, version);
	if (node.type === GMAIL_TYPE) {
		return version >= 2 ? gmailV2Safety(params, version) : gmailV1Safety(params);
	}
	return 'safe';
}

function extractCodeChunks(expression: string): string[] {
	return ExpressionParser.splitExpression(expression)
		.filter((chunk) => chunk.type === 'code')
		.map((chunk) => chunk.text);
}

const BARE_JSON_FIELD_RE = /\$json\.([A-Za-z_$][\w$]*)/g;
const BARE_BINARY_RE = /\$binary(?:\.|\[)/;

function bareCodeReadsBody(code: string): boolean {
	if (BARE_BINARY_RE.test(code)) return true;
	let match: RegExpExecArray | null;
	BARE_JSON_FIELD_RE.lastIndex = 0;
	while ((match = BARE_JSON_FIELD_RE.exec(code)) !== null) {
		if (BODY_FIELDS.has(match[1])) return true;
	}
	return false;
}

function escapeRegex(value: string): string {
	return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function buildExplicitRefRegex(nodeName: string): RegExp {
	const name = escapeRegex(nodeName);
	// Matches $('Gmail'), $node["Gmail"], $node['Gmail'], $items('Gmail') and $items("Gmail")
	return new RegExp(
		`(?:\\$\\(\\s*['"]${name}['"]\\s*\\)|\\$node\\[\\s*['"]${name}['"]\\s*\\]|\\$items\\(\\s*['"]${name}['"]\\s*\\))`,
		'g',
	);
}

const POST_REF_TO_BODY_FIELD_RE =
	/^\s*(?:\.[A-Za-z_$][\w$]*|\[\s*\d+\s*\]|\(\s*\d*\s*\))*\.json\.([A-Za-z_$][\w$]*)/;
const POST_REF_TO_BINARY_RE =
	/^\s*(?:\.[A-Za-z_$][\w$]*|\[\s*\d+\s*\]|\(\s*\d*\s*\))*\.binary(?:\.|\[)/;

function explicitCodeReadsBody(code: string, gmailNodeName: string): boolean {
	const regex = buildExplicitRefRegex(gmailNodeName);
	let match: RegExpExecArray | null;
	while ((match = regex.exec(code)) !== null) {
		const after = code.slice(match.index + match[0].length);
		if (POST_REF_TO_BINARY_RE.test(after)) return true;
		const fieldMatch = after.match(POST_REF_TO_BODY_FIELD_RE);
		if (fieldMatch && BODY_FIELDS.has(fieldMatch[1])) return true;
	}
	return false;
}

function getDirectMainSuccessors(
	connections: Record<string, unknown>,
	sourceName: string,
): Set<string> {
	const out = connections[sourceName] as Record<string, unknown> | undefined;
	if (!out) return new Set();
	const main = out.main;
	if (!Array.isArray(main)) return new Set();
	const result = new Set<string>();
	for (const slot of main) {
		if (!Array.isArray(slot)) continue;
		for (const link of slot) {
			if (typeof link === 'object' && link !== null && 'node' in link) {
				result.add((link as { node: string }).node);
			}
		}
	}
	return result;
}

function getAllMainDescendants(
	connections: Record<string, unknown>,
	sourceName: string,
): Set<string> {
	const visited = new Set<string>();
	const queue: string[] = [sourceName];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		for (const next of getDirectMainSuccessors(connections, current)) {
			if (!visited.has(next)) {
				visited.add(next);
				queue.push(next);
			}
		}
	}
	return visited;
}

function hasAiToolConsumer(connections: Record<string, unknown>, sourceName: string): boolean {
	const out = connections[sourceName] as Record<string, unknown> | undefined;
	if (!out) return false;
	const aiTool = out.ai_tool;
	if (!Array.isArray(aiTool)) return false;
	return aiTool.some(
		(slot) =>
			Array.isArray(slot) &&
			slot.some((link) => typeof link === 'object' && link !== null && 'node' in link),
	);
}

function downstreamReadsBody(
	gmailName: string,
	connections: Record<string, unknown>,
	nodes: WorkflowNodeResponse[],
): boolean {
	const directSuccessors = getDirectMainSuccessors(connections, gmailName);
	const descendants = getAllMainDescendants(connections, gmailName);
	if (descendants.size === 0) return false;

	for (const descendantName of descendants) {
		const node = nodes.find((n) => n.name === descendantName);
		if (!node) continue;
		const expressions = extractExpressionsFromParams(node.parameters ?? {});
		for (const expression of expressions) {
			for (const code of extractCodeChunks(expression)) {
				if (explicitCodeReadsBody(code, gmailName)) return true;
				if (directSuccessors.has(descendantName) && bareCodeReadsBody(code)) return true;
			}
		}
	}
	return false;
}

export const gmailFullContentWhenNeeded: BinaryCheck = {
	name: 'gmail_full_content_when_needed',
	description:
		'Gmail body/content references require simple:false (v2/Trigger) or format:resolved/full (v1)',
	kind: 'deterministic',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		const connections = workflow.connections ?? {};
		const issues: string[] = [];

		for (const node of nodes) {
			if (node.type !== GMAIL_TYPE && node.type !== GMAIL_TRIGGER_TYPE) continue;
			if (getGmailSafety(node) !== 'unsafe') continue;

			if (hasAiToolConsumer(connections, node.name)) {
				issues.push(
					`"${node.name}" is connected as ai_tool with simplified output; the agent may need full body fields`,
				);
				continue;
			}

			if (downstreamReadsBody(node.name, connections, nodes)) {
				issues.push(
					`"${node.name}" downstream nodes read body/content but Gmail returns simplified output`,
				);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0
				? { comment: `Gmail content fetch needs full output: ${issues.join('; ')}` }
				: {}),
		};
	},
};
