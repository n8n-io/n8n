/**
 * HTTP Response Field Validator
 *
 * With Response Format `text`, the HTTP Request node puts the body string under
 * the Output Field option (default `data`) — never under `body`. Reading
 * `$json.body` (or `$('Node').item.json.body`) after a text-format fetch is
 * always undefined and silently breaks length/emptiness checks. The same
 * applies to `item.json.body` in `$input.all().map(...)` over the HTTP output.
 */

import { isRecord } from '@n8n/utils/is-record';

import { mainInputSources } from './connection-helpers';
import type { NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const HTTP_REQUEST_TYPE = 'n8n-nodes-base.httpRequest';
const CODE_NODE_TYPE = 'n8n-nodes-base.code';

const JSON_BODY_FIELD = /\$json\.body\b/;
const NODE_BODY_FIELD = /\$\(\s*['"]([^'"]+)['"]\s*\)\.(?:item|first\(\)|last\(\))\.json\.body\b/;
/** e.g. item.json.body / row.json.body inside $input.all().map(...) */
const ITERATOR_JSON_BODY_FIELD = /\b\w+\.json\.body\b/;

function responseOptions(params: Record<string, unknown>): Record<string, unknown> | undefined {
	const options = isRecord(params.options) ? params.options : undefined;
	const responseWrapper = isRecord(options?.response) ? options.response : undefined;
	const response = isRecord(responseWrapper?.response) ? responseWrapper.response : undefined;
	return response;
}

function isTextResponseFormat(node: NodeInstance<string, string, unknown>): boolean {
	if (node.type !== HTTP_REQUEST_TYPE) return false;
	const params = node.config?.parameters;
	if (!isRecord(params)) return false;
	const response = responseOptions(params);
	return response?.responseFormat === 'text';
}

function outputFieldName(node: NodeInstance<string, string, unknown>): string {
	const params = node.config?.parameters;
	if (!isRecord(params)) return 'data';
	const response = responseOptions(params);
	return typeof response?.outputPropertyName === 'string' && response.outputPropertyName.length > 0
		? response.outputPropertyName
		: 'data';
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

function readsBodyFrom(
	source: string,
	httpParentName: string,
	isImmediatePredecessor: boolean,
): boolean {
	if (isImmediatePredecessor) {
		if (JSON_BODY_FIELD.test(source)) return true;
		// $('Fetch').item.json.body is handled by NODE_BODY_FIELD below.
		if (ITERATOR_JSON_BODY_FIELD.test(source) && !NODE_BODY_FIELD.test(source)) {
			return true;
		}
	}
	for (const match of source.matchAll(new RegExp(NODE_BODY_FIELD.source, 'g'))) {
		if (match[1] === httpParentName) return true;
	}
	return false;
}

/**
 * Validator for text-format HTTP Request body field path mistakes.
 */
export const httpResponseFieldValidator: ValidatorPlugin = {
	id: 'core:http-response-field',
	name: 'HTTP Response Field Validator',
	priority: 37,

	validateNode: (): ValidationIssue[] => [],

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		for (const [mapKey, graphNode] of ctx.nodes) {
			const predecessors = mainInputSources(mapKey, ctx.nodes);
			const textHttpParents = predecessors
				.map((name) => {
					const parent = ctx.nodes.get(name);
					if (!parent || !isTextResponseFormat(parent.instance)) return undefined;
					return { name, field: outputFieldName(parent.instance) };
				})
				.filter((entry): entry is { name: string; field: string } => entry !== undefined);

			if (textHttpParents.length === 0) continue;

			for (const { source, parameterPath } of sourcesOf(graphNode.instance)) {
				for (const parent of textHttpParents) {
					const immediate = predecessors.includes(parent.name);
					if (!readsBodyFrom(source, parent.name, immediate)) continue;
					const correctPath = immediate
						? `$json.${parent.field}`
						: `$('${parent.name}').item.json.${parent.field}`;
					issues.push({
						code: 'HTTP_TEXT_BODY_FIELD',
						message:
							`'${mapKey}' parameter '${parameterPath}' reads \`.body\` from text-format HTTP ` +
							`Request '${parent.name}', but text responses land under \`${correctPath}\` ` +
							'(the Output Field option; default `data`) — never under `body`. Update the path.',
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
