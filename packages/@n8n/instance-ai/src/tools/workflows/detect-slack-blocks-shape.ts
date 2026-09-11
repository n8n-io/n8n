import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { ValidationWarning } from './workflow-validation-warnings';

const SLACK_NODE_TYPE = 'n8n-nodes-base.slack';
/** V1 stores `blocksUi` as a fixedCollection and has no `messageType`, so it is out of scope. */
const MIN_TYPE_VERSION = 2;
const BLOCK_CAPABLE_OPERATIONS = ['post', 'schedule', 'update'];

const WRAPPER_HINT =
	'The Blocks field must hold the whole Block Kit payload object — { "blocks": [ ... ] } — not the bare blocks array.';

// n8n treats a value as an expression only when its FIRST character is '='.
function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith('=');
}

type ResolvedBlocksUi =
	| { kind: 'skip' }
	| { kind: 'unparseable'; error: string }
	| { kind: 'value'; value: unknown };

/** `{{ ... }}` interpolation segments inside an expression body. */
const INTERPOLATION = /\{\{[\s\S]*?\}\}/g;
const INTERPOLATION_PLACEHOLDER = 'n8n-expression';

/**
 * The builder usually writes the payload as an `=` expression whose body is the
 * literal JSON with `{{ }}` holes, so the wrapper mistake shows up there too.
 * Blanking the holes keeps such a body parseable; a wholly dynamic expression
 * stops parsing and is left alone, since its value is unknowable here.
 */
function resolveExpressionBody(raw: string): ResolvedBlocksUi {
	const body = raw.slice(1).replace(INTERPOLATION, INTERPOLATION_PLACEHOLDER);
	try {
		return { kind: 'value', value: JSON.parse(body) };
	} catch {
		return { kind: 'skip' };
	}
}

/**
 * Mirrors the node's `ensureType: 'object'` read of `blocksUi`: a JSON string is
 * parsed, anything else is passed through as-is.
 */
function resolveBlocksUi(raw: unknown): ResolvedBlocksUi {
	if (raw === undefined || raw === null) return { kind: 'skip' };
	if (typeof raw === 'string') {
		if (raw.trim().length === 0) return { kind: 'skip' };
		if (isExpression(raw)) return resolveExpressionBody(raw);
		try {
			return { kind: 'value', value: JSON.parse(raw) };
		} catch (error) {
			return { kind: 'unparseable', error: error instanceof Error ? error.message : 'parse error' };
		}
	}
	// An empty fixedCollection-style default carries no blocks to check.
	if (isRecord(raw) && Object.keys(raw).length === 0) return { kind: 'skip' };
	return { kind: 'value', value: raw };
}

function describe(value: unknown): string {
	if (Array.isArray(value)) return 'an array';
	if (value === null) return 'null';
	return `a ${typeof value}`;
}

/**
 * Flags Slack message nodes whose Block Kit config cannot render at runtime.
 *
 * The node reads `blocksUi` as an object and sends it to Slack as the request
 * body, picking blocks off `content.blocks`. A bare `[ ... ]` array — the shape
 * the builder reaches for by default — leaves `blocks` undefined, so Slack gets
 * a body with no blocks, returns `ok: true`, and renders nothing. Same silent
 * outcome when the blocks live under some other key, or when the node is set to
 * send text while carrying a blocks payload.
 */
export function detectSlackBlocksShape(json: WorkflowJSON): ValidationWarning[] {
	const warnings: ValidationWarning[] = [];

	for (const node of json.nodes ?? []) {
		if (node.type !== SLACK_NODE_TYPE) continue;
		if (typeof node.typeVersion !== 'number' || node.typeVersion < MIN_TYPE_VERSION) continue;
		const params = node.parameters;
		if (!isRecord(params)) continue;

		const resource = params.resource ?? 'message';
		const operation = params.operation ?? 'post';
		if (resource !== 'message') continue;
		if (typeof operation !== 'string' || !BLOCK_CAPABLE_OPERATIONS.includes(operation)) continue;

		const messageType = params.messageType ?? 'text';
		// A non-string messageType is malformed config the schema validator already reports.
		if (typeof messageType !== 'string' || isExpression(messageType)) continue;

		const resolved = resolveBlocksUi(params.blocksUi);
		if (resolved.kind === 'skip') continue;

		const nodeName = typeof node.name === 'string' ? node.name : undefined;

		if (messageType !== 'block') {
			warnings.push({
				code: 'SLACK_BLOCKS_NOT_SENT',
				nodeName,
				message:
					`Slack node carries a Blocks payload but its Message Type is "${messageType}", ` +
					'so the blocks are dropped and only the plain text is posted. ' +
					'Set messageType to "block" to send them.',
			});
			continue;
		}

		if (resolved.kind === 'unparseable') {
			warnings.push({
				code: 'SLACK_BLOCKS_SHAPE_INVALID',
				nodeName,
				message:
					`Slack node Blocks field is not valid JSON (${resolved.error}). ` +
					'The node parses it before sending and throws "could not be parsed" at runtime. ' +
					WRAPPER_HINT,
			});
			continue;
		}

		const content = resolved.value;
		if (!isRecord(content) || Array.isArray(content)) {
			warnings.push({
				code: 'SLACK_BLOCKS_SHAPE_INVALID',
				nodeName,
				message:
					`Slack node Blocks field holds ${describe(content)}. ` +
					'The node reads blocks off the "blocks" key of that value, so nothing is sent to Slack, ' +
					'the call still returns ok, and the message renders empty. ' +
					WRAPPER_HINT,
			});
			continue;
		}

		const blocks = content.blocks;
		if (isExpression(blocks)) continue;

		if (blocks === undefined) {
			warnings.push({
				code: 'SLACK_BLOCKS_SHAPE_INVALID',
				nodeName,
				message:
					`Slack node Blocks field has no "blocks" key (found: ${Object.keys(content).join(', ') || 'nothing'}). ` +
					'Slack receives a body with no blocks, returns ok, and the message renders empty. ' +
					WRAPPER_HINT,
			});
			continue;
		}

		if (!Array.isArray(blocks)) {
			warnings.push({
				code: 'SLACK_BLOCKS_SHAPE_INVALID',
				nodeName,
				message:
					`Slack node Blocks field has a "blocks" value that is ${describe(blocks)}, not an array. ` +
					'Slack rejects or ignores it and the message renders empty. ' +
					WRAPPER_HINT,
			});
		}
	}

	return warnings;
}
