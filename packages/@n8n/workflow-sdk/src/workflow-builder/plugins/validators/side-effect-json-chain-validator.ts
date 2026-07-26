/**
 * Side-Effect JSON Chain Validator
 *
 * Send/notify/create nodes replace item JSON with their API response. A
 * downstream node that reads bare `$json.<field>` for non-response fields
 * silently gets undefined. Prefer `$('Upstream').item.json.<field>` or a
 * parallel branch from the data-producing node.
 */

import { isRecord } from '@n8n/utils/is-record';

import { mainInputSources } from './connection-helpers';
import type { NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';

/** Node types whose main success output is typically an API ack, not the input item. */
const SIDE_EFFECT_TYPES: ReadonlySet<string> = new Set([
	'n8n-nodes-base.slack',
	'n8n-nodes-base.gmail',
	'n8n-nodes-base.telegram',
	'n8n-nodes-base.emailSend',
	'n8n-nodes-base.discord',
	'n8n-nodes-base.microsoftTeams',
	'n8n-nodes-base.mattermost',
	'n8n-nodes-base.twilio',
	'n8n-nodes-base.whatsApp',
]);

/** Messaging operations that replace item JSON with an API ack. */
const SIDE_EFFECT_OPERATIONS = new Set(['send', 'sendAndWait', 'post', 'message']);

/** Fields commonly present on send/create API responses — reading these is fine. */
const API_RESPONSE_FIELDS = new Set([
	'ok',
	'id',
	'message',
	'message_id',
	'messageId',
	'ts',
	'channel',
	'thread_ts',
	'threadId',
	'statusCode',
	'status',
	'headers',
	'body',
	'data',
	'error',
	'name',
	'htmlLink',
	'permalink',
	'success',
	'result',
	'output',
]);

const BARE_JSON_FIELD = /\$json\.([A-Za-z_][A-Za-z0-9_]*)/g;

function isSideEffectNode(node: NodeInstance<string, string, unknown>): boolean {
	if (!SIDE_EFFECT_TYPES.has(node.type)) return false;

	const params = node.config?.parameters;
	const operation =
		isRecord(params) && typeof params.operation === 'string' ? params.operation : undefined;

	// Messaging nodes default to send when operation is omitted.
	if (operation === undefined) return true;
	return SIDE_EFFECT_OPERATIONS.has(operation);
}

function sourcesOf(node: NodeInstance<string, string, unknown>): Array<{
	source: string;
	parameterPath: string;
}> {
	const params = node.config?.parameters;
	const sources: Array<{ source: string; parameterPath: string }> = [];
	if (!isRecord(params)) return sources;

	for (const entry of extractExpressions(params)) {
		sources.push({ source: entry.expression, parameterPath: entry.path });
	}

	if (
		node.type === CODE_NODE_TYPE &&
		typeof params.jsCode === 'string' &&
		params.jsCode.length > 0
	) {
		sources.push({ source: params.jsCode, parameterPath: 'jsCode' });
	}

	return sources;
}

function nonResponseJsonFields(source: string): string[] {
	const fields: string[] = [];
	for (const match of source.matchAll(BARE_JSON_FIELD)) {
		const field = match[1];
		if (!API_RESPONSE_FIELDS.has(field)) {
			fields.push(field);
		}
	}
	return [...new Set(fields)];
}

/**
 * Validator for bare `$json` reads immediately after side-effect nodes.
 */
export const sideEffectJsonChainValidator: ValidatorPlugin = {
	id: 'core:side-effect-json-chain',
	name: 'Side-Effect JSON Chain Validator',
	priority: 36,

	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		for (const [mapKey, graphNode] of ctx.nodes) {
			const predecessors = mainInputSources(mapKey, ctx.nodes);
			const sideEffectParents = predecessors.filter((name) => {
				const parent = ctx.nodes.get(name);
				return parent !== undefined && isSideEffectNode(parent.instance);
			});
			if (sideEffectParents.length === 0) continue;

			for (const { source, parameterPath } of sourcesOf(graphNode.instance)) {
				const fields = nonResponseJsonFields(source);
				if (fields.length === 0) continue;

				const parentLabel = sideEffectParents.join("', '");
				const fieldLabel = fields.slice(0, 3).join(', ');
				issues.push({
					code: 'SIDE_EFFECT_JSON_CHAIN',
					message:
						`'${mapKey}' parameter '${parameterPath}' reads \`$json.${fieldLabel}\` immediately after ` +
						`side-effect node(s) '${parentLabel}'. Send/create nodes replace item JSON with their API ` +
						'response, so those fields are usually undefined. Reference the data producer by name ' +
						"(`$('Upstream').item.json.${fields[0]}`) or wire this node in parallel from that producer.",
					severity: 'warning',
					violationLevel: 'major',
					nodeName: mapKey,
					parameterPath,
				});
			}
		}

		return issues;
	},
};
