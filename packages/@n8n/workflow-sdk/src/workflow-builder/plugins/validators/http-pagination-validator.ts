/**
 * HTTP Pagination Validator
 *
 * Flags HTTP Request nodes that paginate with `responseIsEmpty` (or leave it
 * defaulted) when the declared output body is an envelope wrapping an array.
 * `responseIsEmpty` continues while
 * `Array.isArray($response.body) ? $response.body.length : !!$response.body`,
 * so `{"orders": []}` is truthy and paging never stops until n8n aborts.
 */

import { isRecord } from '@n8n/utils/is-record';

import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const HTTP_REQUEST_TYPE = 'n8n-nodes-base.httpRequest';

function unwrapItemJson(item: Record<string, unknown>): Record<string, unknown> {
	if ('json' in item && isRecord(item.json)) {
		return item.json;
	}
	return item;
}

function getPaginationConfig(params: Record<string, unknown>): Record<string, unknown> | undefined {
	const options = isRecord(params.options) ? params.options : undefined;
	const paginationWrapper = isRecord(options?.pagination) ? options.pagination : undefined;
	const pagination = isRecord(paginationWrapper?.pagination)
		? paginationWrapper.pagination
		: undefined;
	return pagination;
}

function isPaginationEnabled(pagination: Record<string, unknown>): boolean {
	const mode = pagination.paginationMode;
	return typeof mode === 'string' && mode !== 'off';
}

function usesResponseIsEmpty(pagination: Record<string, unknown>): boolean {
	const completeWhen = pagination.paginationCompleteWhen;
	// Default when pagination is on is `responseIsEmpty` (HttpRequest V3 Description).
	return completeWhen === undefined || completeWhen === 'responseIsEmpty';
}

/**
 * An envelope wraps a list under a named key (`{ orders: [...] }`) rather than
 * being a bare array (which the HTTP node splits into one item per element).
 */
function findEnvelopeArrayField(outputShape: Record<string, unknown>): string | undefined {
	for (const [key, value] of Object.entries(outputShape)) {
		if (Array.isArray(value)) {
			return key;
		}
	}
	return undefined;
}

function getDeclaredOutputShape(
	node: NodeInstance<string, string, unknown>,
): Record<string, unknown> | undefined {
	const output = node.config?.output;
	if (!output || output.length === 0) return undefined;
	const first = output[0];
	if (!isRecord(first)) return undefined;
	return unwrapItemJson(first);
}

/**
 * Validator for HTTP Request pagination stop conditions vs declared output shape.
 */
export const httpPaginationValidator: ValidatorPlugin = {
	id: 'core:http-pagination',
	name: 'HTTP Pagination Validator',
	nodeTypes: [HTTP_REQUEST_TYPE],
	priority: 48,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		const params = node.config?.parameters;
		if (!isRecord(params)) return [];

		const pagination = getPaginationConfig(params);
		if (!pagination || !isPaginationEnabled(pagination) || !usesResponseIsEmpty(pagination)) {
			return [];
		}

		const outputShape = getDeclaredOutputShape(node);
		if (!outputShape) return [];

		const arrayField = findEnvelopeArrayField(outputShape);
		if (!arrayField) return [];

		return [
			{
				code: 'HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY',
				message:
					`'${node.name}' paginates with paginationCompleteWhen: 'responseIsEmpty' (the default), but its ` +
					`declared output is an envelope wrapping an array under "${arrayField}". ` +
					'responseIsEmpty continues while Array.isArray($response.body) ? $response.body.length : !!$response.body, ' +
					`so {"${arrayField}": []} is truthy and paging never stops until n8n aborts with "identical response 5x". ` +
					`Set paginationCompleteWhen: 'other' and completeExpression: '={{ $response.body.${arrayField}.length === 0 }}' ` +
					'(true when done). Keep responseIsEmpty only when the endpoint returns a bare top-level array.',
				severity: 'warning',
				nodeName: node.name,
				parameterPath: 'options.pagination.pagination.paginationCompleteWhen',
			},
		];
	},
};
