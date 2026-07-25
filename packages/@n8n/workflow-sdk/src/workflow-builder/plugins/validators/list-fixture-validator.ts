/**
 * List Fixture Validator
 *
 * - SINGLE_ITEM_LIST_FIXTURE: a collection source mocked with one item hides
 *   array-vs-single bugs, so `$input.first()` assumptions verify green and
 *   break on the user's first real run.
 * - HTTP_ENVELOPE_NOT_UNWRAPPED: a page envelope (`{ orders: [...] }`) is one
 *   item, not one item per record. Loops and per-item Code need an unwrap
 *   (Split Out, or a Code node that maps the array field) first.
 */

import { isRecord } from '@n8n/utils/is-record';

import { mainSuccessors, walkDownstream } from './connection-helpers';
import { NODE_TYPES, isHttpRequestType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';
const SPLIT_OUT_TYPE = 'n8n-nodes-base.splitOut';
const ITEM_LISTS_TYPE = 'n8n-nodes-base.itemLists';
const AGGREGATE_TYPE = 'n8n-nodes-base.aggregate';
const SUMMARIZE_TYPE = 'n8n-nodes-base.summarize';

/** Operations that return a collection rather than a single record. */
const COLLECTION_OPERATIONS = new Set([
	'getAll',
	'getMany',
	'search',
	'list',
	'lookup',
	'readAllRows',
	'getRows',
]);

const FIRST_ITEM_READ = /\$input\.first\(\)|\$input\.all\(\)\[0\]|items\[0\]|\.first\(\)/;
const ALL_ITEMS_READ = /\$input\.all\(\)|\$input\.last\(\)/;

function declaredOutput(
	node: NodeInstance<string, string, unknown>,
): Array<Record<string, unknown>> | undefined {
	const output = node.config?.output;
	if (!Array.isArray(output) || output.length === 0) return undefined;
	return output.filter(isRecord);
}

function unwrapItemJson(item: Record<string, unknown>): Record<string, unknown> {
	if ('json' in item && isRecord(item.json)) {
		return item.json;
	}
	return item;
}

function looksLikeCollectionSource(node: NodeInstance<string, string, unknown>): boolean {
	if (isHttpRequestType(node.type)) return true;
	const params = node.config?.parameters;
	if (!isRecord(params)) return false;
	if (typeof params.operation === 'string' && COLLECTION_OPERATIONS.has(params.operation)) {
		return true;
	}
	return params.returnAll === true;
}

/** First array-valued field on the fixture — the envelope key wrapping the list. */
function findEnvelopeArrayField(shape: Record<string, unknown>): string | undefined {
	for (const [key, value] of Object.entries(shape)) {
		if (Array.isArray(value)) return key;
	}
	return undefined;
}

function jsCodeOf(node: NodeInstance<string, string, unknown>): string | undefined {
	const params = node.config?.parameters;
	if (!isRecord(params)) return undefined;
	return typeof params.jsCode === 'string' ? params.jsCode : undefined;
}

function isPerItemCode(node: NodeInstance<string, string, unknown>): boolean {
	const params = node.config?.parameters;
	return node.type === CODE_NODE_TYPE && isRecord(params) && params.mode === 'runOnceForEachItem';
}

/** Nodes that treat their input as one item per record. */
function isLoopConsumer(node: NodeInstance<string, string, unknown>): boolean {
	return node.type === NODE_TYPES.SPLIT_IN_BATCHES || isPerItemCode(node);
}

/** Nodes that collapse many items, or reads that assume a single item. */
function collapsesOrAssumesSingleItem(node: NodeInstance<string, string, unknown>): boolean {
	if (
		node.type === AGGREGATE_TYPE ||
		node.type === SUMMARIZE_TYPE ||
		node.type === NODE_TYPES.SPLIT_IN_BATCHES
	) {
		return true;
	}

	const code = jsCodeOf(node);
	if (code && (FIRST_ITEM_READ.test(code) || ALL_ITEMS_READ.test(code))) return true;

	const params = node.config?.parameters;
	if (!isRecord(params)) return false;
	return extractExpressions(params).some((entry) => FIRST_ITEM_READ.test(entry.expression));
}

/** Split Out / itemLists / a Code node that maps the envelope's array field. */
function isUnwrapNode(node: NodeInstance<string, string, unknown>, arrayField: string): boolean {
	if (node.type === SPLIT_OUT_TYPE || node.type === ITEM_LISTS_TYPE) return true;

	const code = jsCodeOf(node);
	if (!code) return false;
	// An unwrap reads the array field and emits per-record items.
	return code.includes(arrayField) && (code.includes('.map(') || code.includes('for '));
}

/**
 * Validator for collection fixture cardinality and envelope unwrapping.
 */
export const listFixtureValidator: ValidatorPlugin = {
	id: 'core:list-fixture',
	name: 'List Fixture Validator',
	priority: 41,

	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[] {
		const output = declaredOutput(node);
		if (!output || output.length === 0) return [];

		const issues: ValidationIssue[] = [];
		const successors = mainSuccessors(graphNode);
		if (successors.length === 0) return issues;

		const firstShape = unwrapItemJson(output[0]);
		const arrayField = findEnvelopeArrayField(firstShape);

		if (arrayField !== undefined && looksLikeCollectionSource(node)) {
			const consumer = walkDownstream(successors, ctx.nodes, (_name, candidate) => {
				if (isUnwrapNode(candidate.instance, arrayField)) return 'stop';
				if (isLoopConsumer(candidate.instance)) return 'match';
				return 'continue';
			});

			if (consumer !== undefined) {
				issues.push({
					code: 'HTTP_ENVELOPE_NOT_UNWRAPPED',
					message:
						`'${node.name}' emits one item wrapping a list under "${arrayField}", but '${consumer}' ` +
						'consumes it per record with no unwrap in between. One envelope item is not one item per ' +
						`record — add a Split Out on "${arrayField}" (or a Code node that maps it) before the loop. ` +
						'Note $input.all().map(i => i.json) is not an unwrap.',
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'output',
				});
			}
		}

		if (output.length === 1 && arrayField === undefined && looksLikeCollectionSource(node)) {
			const consumer = walkDownstream(successors, ctx.nodes, (_name, candidate) =>
				collapsesOrAssumesSingleItem(candidate.instance) ? 'match' : 'continue',
			);

			if (consumer !== undefined) {
				issues.push({
					code: 'SINGLE_ITEM_LIST_FIXTURE',
					message:
						`'${node.name}' is a collection source but declares only one output fixture item, while ` +
						`'${consumer}' loops or reads items collectively. Declare at least two items so ` +
						'single-item assumptions like $input.first() break during verification instead of on the ' +
						"user's first real run.",
					severity: 'warning',
					violationLevel: 'major',
					nodeName: node.name,
					parameterPath: 'output',
				});
			}
		}

		return issues;
	},
};
