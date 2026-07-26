/**
 * List Fixture Validator
 *
 * - SINGLE_ITEM_LIST_FIXTURE: a collection source mocked with one item hides
 *   array-vs-single bugs, so `$input.first()` assumptions verify green and
 *   break on the user's first real run.
 * - HTTP_ENVELOPE_NOT_UNWRAPPED: list APIs often return one n8n item wrapping
 *   an array (`{ value: [...] }`, `{ results: [...] }`, …). Downstream nodes
 *   must not treat `$input.all()` length or per-item iteration as record count
 *   until that array field is unwrapped (Split Out, or Code that maps it).
 */

import { isRecord } from '@n8n/utils/is-record';

import { findUpstream, mainSuccessors, walkDownstream } from './connection-helpers';
import { NODE_TYPES, isHttpRequestType } from '../../../constants/node-types';
import type { GraphNode, NodeInstance } from '../../../types/base';
import { extractExpressions } from '../../validation-helpers';
import type { PluginContext, ValidationIssue, ValidatorPlugin } from '../types';

const CODE_NODE_TYPE = 'n8n-nodes-base.code';
const SPLIT_OUT_TYPE = 'n8n-nodes-base.splitOut';
const ITEM_LISTS_TYPE = 'n8n-nodes-base.itemLists';
const AGGREGATE_TYPE = 'n8n-nodes-base.aggregate';
const SUMMARIZE_TYPE = 'n8n-nodes-base.summarize';

const MAX_UPSTREAM_HOPS = 6;

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
const ALL_ITEMS_CALL = /\$input\.all\s*\(\s*\)/;

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

/** Code reads the array inside a response envelope before counting or iterating records. */
function unwrapsEnvelopeArray(code: string): boolean {
	return (
		/\.json\.\w+\.(?:length|map|flatMap|filter|forEach|slice|reduce)\b/.test(code) ||
		(/\.\w+\s*\?\?\s*\[\]/.test(code) && /\.json\.\w+/.test(code))
	);
}

/**
 * Treats n8n item count as record count, or iterates `$input.all()` items as
 * records, without unwrapping a list API envelope first.
 */
function isEnvelopeMisconsumer(node: NodeInstance<string, string, unknown>): boolean {
	if (node.type === NODE_TYPES.SPLIT_IN_BATCHES || isPerItemCode(node)) return true;

	const code = jsCodeOf(node);
	if (!code || !ALL_ITEMS_CALL.test(code) || unwrapsEnvelopeArray(code)) return false;

	if (/\$input\.all\s*\(\s*\)\.length\b/.test(code)) return true;

	const assigned = code.match(/(?:const|let|var)\s+(\w+)\s*=\s*\$input\.all\s*\(\s*\)/);
	if (assigned) {
		const variable = assigned[1];
		if (new RegExp(`\\b${variable}\\.length\\s*===?\\s*0\\b`).test(code)) return true;
		if (new RegExp(`for\\s*\\(\\s*(?:const|let|var)\\s+\\w+\\s+of\\s+${variable}\\b`).test(code)) {
			return true;
		}
	}

	if (/for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+\$input\.all\s*\(\s*\)/.test(code)) {
		return true;
	}

	if (/\$input\.all\s*\(\s*\)\.map\s*\(/.test(code)) return true;

	return false;
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

/** Split Out / itemLists / Code that maps an array field out of the envelope. */
function isUnwrapNode(
	node: NodeInstance<string, string, unknown>,
	arrayField: string | undefined,
): boolean {
	if (node.type === SPLIT_OUT_TYPE || node.type === ITEM_LISTS_TYPE) return true;

	const code = jsCodeOf(node);
	if (!code) return false;

	if (arrayField) {
		return code.includes(arrayField) && (code.includes('.map(') || code.includes('for '));
	}

	return (
		/\.json\.\w+\.(?:map|flatMap|filter|reduce)\s*\(/.test(code) ||
		(/\bfor\s*\(/.test(code) && /\.json\.\w+/.test(code))
	);
}

function envelopeArrayFieldForSource(
	source: NodeInstance<string, string, unknown>,
): string | undefined {
	const output = declaredOutput(source);
	if (!output) return undefined;
	return findEnvelopeArrayField(unwrapItemJson(output[0]));
}

function likelyEnvelopeSource(source: NodeInstance<string, string, unknown>): boolean {
	if (isHttpRequestType(source.type)) return true;
	return envelopeArrayFieldForSource(source) !== undefined;
}

function buildEnvelopeNotUnwrappedMessage(
	sourceName: string,
	consumerName: string,
	arrayField: string | undefined,
): string {
	const fieldHint = arrayField
		? `under "${arrayField}"`
		: 'with an array field on the response object';
	const unwrapHint = arrayField
		? `Split Out on "${arrayField}" (or Code that maps \`$json.${arrayField}\`)`
		: 'Split Out on the array field (or Code that maps it, e.g. `$json.value.map(...)`)';

	return (
		`'${sourceName}' is a list API source that emits one n8n item wrapping records ${fieldHint}, ` +
		`but '${consumerName}' uses $input.all() item count or iterates those items as records with no unwrap ` +
		`in between. Item count ≠ record count — an empty list can still be one wrapper item. ` +
		`Add ${unwrapHint} before counting or looping. Note $input.all().map(i => i.json) is not an unwrap.`
	);
}

function findEnvelopeMisconsumerDownstream(
	startNames: readonly string[],
	nodes: ReadonlyMap<string, GraphNode>,
	arrayField: string | undefined,
): string | undefined {
	return walkDownstream(startNames, nodes, (_name, candidate) => {
		if (isUnwrapNode(candidate.instance, arrayField)) return 'stop';
		if (isEnvelopeMisconsumer(candidate.instance)) return 'match';
		return 'continue';
	});
}

function validateEnvelopeMisconsumerCode(
	node: NodeInstance<string, string, unknown>,
	ctx: PluginContext,
): ValidationIssue[] {
	if (!isEnvelopeMisconsumer(node)) return [];

	const sourceName = findUpstream(
		node.name,
		ctx.nodes,
		(_name, candidate) => looksLikeCollectionSource(candidate.instance),
		{ maxHops: MAX_UPSTREAM_HOPS },
	);
	if (sourceName === undefined) return [];

	const sourceNode = ctx.nodes.get(sourceName)?.instance;
	if (!sourceNode || !likelyEnvelopeSource(sourceNode)) return [];

	const arrayField = envelopeArrayFieldForSource(sourceNode);
	const hit = walkDownstream([sourceName], ctx.nodes, (name, candidate) => {
		if (isUnwrapNode(candidate.instance, arrayField)) return 'stop';
		if (name === node.name && isEnvelopeMisconsumer(candidate.instance)) return 'match';
		return 'continue';
	});
	if (hit !== node.name) return [];

	return [
		{
			code: 'HTTP_ENVELOPE_NOT_UNWRAPPED',
			message: buildEnvelopeNotUnwrappedMessage(sourceName, node.name, arrayField),
			severity: 'warning',
			violationLevel: 'major',
			nodeName: node.name,
			parameterPath: 'jsCode',
		},
	];
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
		const issues = validateEnvelopeMisconsumerCode(node, ctx);

		const output = declaredOutput(node);
		if (!output || output.length === 0) return issues;

		const successors = mainSuccessors(graphNode);
		if (successors.length === 0) return issues;

		const firstShape = unwrapItemJson(output[0]);
		const arrayField = findEnvelopeArrayField(firstShape);

		if (arrayField !== undefined && looksLikeCollectionSource(node)) {
			const consumer = findEnvelopeMisconsumerDownstream(successors, ctx.nodes, arrayField);

			if (consumer !== undefined) {
				issues.push({
					code: 'HTTP_ENVELOPE_NOT_UNWRAPPED',
					message: buildEnvelopeNotUnwrappedMessage(node.name, consumer, arrayField),
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
