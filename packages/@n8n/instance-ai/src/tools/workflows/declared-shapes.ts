import { wrapUntrustedData } from '@n8n/agents';
import { validate, type JsonSchema } from '@n8n/node-sdk';
import { exampleOf } from '@n8n/node-sdk/host';
import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { declaredOutputOf } from './next-workflow-build';
import type { NodeOutputResult } from '../../types';
import type { WorkflowBuildOutcome } from '../../workflow-loop/workflow-loop-state';
import { unwrapUntrustedData } from '../orchestration/verification/analyze-result';

/**
 * Node contracts: a declared output shape, e.g. an HTTP `schema`, types the reads but no run
 * checks it. These checks compare the output that a run gives with the declared shape, and name
 * the nodes that verification pinned with a fixture made from it.
 */

// One warning names this many issues of a node, as the output drift warning of the runtime.
const MAX_ISSUES = 10;

const DRIFT_GUIDANCE =
	'Fix the `schema` to match the real output, or fix the reads of these fields.';

/**
 * `schema` with each listed property expected. The derived output types each property as present,
 * so an absent one breaks a read. An object that lists `required` keeps the JSON Schema meaning.
 * With `open`, an object also takes fields that it does not list: a real response has more fields
 * than the reads need, and the types stay closed.
 */
const expectingAll = (schema: JsonSchema, open: boolean): JsonSchema => {
	const { additionalProperties, ...rest } = schema;
	const expecting = (child: JsonSchema) => expectingAll(child, open);
	return {
		...rest,
		...(schema.properties
			? {
					properties: Object.fromEntries(
						Object.entries(schema.properties).map(([key, child]) => [key, expecting(child)]),
					),
					required: schema.required ?? Object.keys(schema.properties),
				}
			: {}),
		...(schema.items ? { items: expecting(schema.items) } : {}),
		...(schema.anyOf ? { anyOf: schema.anyOf.map(expecting) } : {}),
		...(schema.oneOf ? { oneOf: schema.oneOf.map(expecting) } : {}),
		...(isRecord(additionalProperties)
			? { additionalProperties: expecting(additionalProperties) }
			: additionalProperties === undefined || open
				? {}
				: { additionalProperties }),
	};
};

/**
 * A full response whose status is outside 2xx. The declared schema describes the success body,
 * so an error body is no drift: a scenario can expect a 404 that the workflow handles.
 */
const isErrorResponse = (item: Record<string, unknown>) =>
	typeof item.statusCode === 'number' &&
	'body' in item &&
	(item.statusCode < 200 || item.statusCode > 299);

/**
 * The items of the first output that a check can read: no truncated item, no error item and no
 * error response.
 */
function checkedItemsOf(output: NodeOutputResult): Array<Record<string, unknown>> {
	return (output.outputs[0]?.items ?? [])
		.map((item) => (typeof item === 'string' ? unwrapUntrustedData(item) : item))
		.filter(
			(item): item is Record<string, unknown> =>
				isRecord(item) &&
				item._truncatedItem !== true &&
				!(Object.keys(item).length === 1 && 'error' in item) &&
				!isErrorResponse(item),
		);
}

/** Each issue once, with list indexes left out, e.g. `$json.issues[].title: missing`. */
const issuesOf = (items: ReadonlyArray<Record<string, unknown>>, schema: JsonSchema) => [
	...new Set(
		items.flatMap((item) =>
			validate(item, schema, { path: '$json' }).map((issue) =>
				issue.replace(/\[\d+\]/g, '[]').replace(/: is required$/, ': missing'),
			),
		),
	),
];

/**
 * The missing fields, wrong types and nulls. A field that the schema does not list is no issue,
 * but an object that misses a field also names its unlisted fields: one of them is often the
 * field under another name.
 */
function driftIssues(items: ReadonlyArray<Record<string, unknown>>, schema: JsonSchema) {
	const issues = issuesOf(items, expectingAll(schema, true));
	const missingIn = new Set(
		issues.flatMap((issue) => /^(.+)\.[^.]+: missing$/.exec(issue)?.[1] ?? []),
	);
	const unlisted = issuesOf(items, expectingAll(schema, false)).filter((issue) => {
		const at = /^(.+): unknown field\(s\) /.exec(issue)?.[1];
		return at !== undefined && missingIn.has(at);
	});
	return [...issues, ...unlisted];
}

const driftLine = (nodeName: string, issues: readonly string[]) => {
	const shown = issues.slice(0, MAX_ISSUES).join('; ');
	const more = issues.length > MAX_ISSUES ? ` (${issues.length - MAX_ISSUES} more)` : '';
	return `${nodeName}: the output does not match its declared schema: ${shown}${more}`;
};

/**
 * One warning for each node with a declared output whose items do not match it, or `undefined`.
 * `readOutput` gives the first page of items (`getNodeOutput`, 10 by default). With `reached`,
 * only the nodes that the run reached are read. A node whose output cannot be read is left out.
 * The output values are untrusted, so the block is wrapped.
 */
export async function shapeWarningsBlock(args: {
	workflow: WorkflowJSON;
	reached?: readonly string[];
	readOutput: (nodeName: string) => Promise<NodeOutputResult>;
}): Promise<string | undefined> {
	const { workflow, reached, readOutput } = args;
	const lines = await Promise.all(
		workflow.nodes.map(async (node) => {
			const schema = declaredOutputOf(node);
			if (!schema || !node.name || !(reached?.includes(node.name) ?? true)) return [];
			const output = await readOutput(node.name).catch(() => undefined);
			const issues = output ? driftIssues(checkedItemsOf(output), schema) : [];
			return issues.length > 0 ? [driftLine(node.name, issues)] : [];
		}),
	);
	const warnings = lines.flat();
	return warnings.length > 0
		? wrapUntrustedData([...warnings, DRIFT_GUIDANCE].join('\n'), 'verification', 'shape-warnings')
		: undefined;
}

/**
 * A note that names the reached nodes that verification pinned with a fixture made from their
 * declared output, or `undefined`. The run then proves the wiring, not the response shape.
 */
export function declaredShapeNote(
	workflow: WorkflowJSON,
	outcome: Pick<WorkflowBuildOutcome, 'nodeSimulationPlan' | 'fixtureOrigins'>,
	reached?: readonly string[],
): string | undefined {
	const names = workflow.nodes.flatMap(({ name }) =>
		name !== undefined &&
		outcome.fixtureOrigins?.[name] === 'declared' &&
		outcome.nodeSimulationPlan?.some(
			(verdict) => verdict.nodeName === name && verdict.verdict === 'simulate',
		) &&
		(reached?.includes(name) ?? true)
			? [name]
			: [],
	);
	return names.length > 0
		? `Verification pinned a fixture made from the declared \`schema\` of ${names.join(', ')}, so this response shape is unproven. Take the schema from the API docs; a real run of the node reports where the response differs.`
		: undefined;
}

/** A key of an object, or `0`, the first entry of a list. */
type Segment = string | 0;

interface UnionBranch {
	readonly path: readonly Segment[];
	readonly schema: JsonSchema;
	/** E.g. `$json.organization: null` or `$json.owner: anyOf[1]`. */
	readonly label: string;
}

const pathText = (path: readonly Segment[]) =>
	path.reduce<string>(
		(text, segment) => (segment === 0 ? `${text}[]` : `${text}.${segment}`),
		'$json',
	);

/**
 * Each union option that `exampleOf` does not take: for each `anyOf` or `oneOf`, every option
 * but the first that is not null. Below a union, only the taken option is walked, because the
 * other variants start from the example.
 */
function otherBranchesOf(schema: JsonSchema, path: readonly Segment[] = []): UnionBranch[] {
	const union = schema.oneOf ?? schema.anyOf;
	if (union) {
		const keyword = schema.oneOf ? 'oneOf' : 'anyOf';
		const taken = union.find((option) => option.type !== 'null') ?? union[0];
		return [
			...union.flatMap((option, index) =>
				option === taken
					? []
					: [
							{
								path,
								schema: option,
								label: `${pathText(path)}: ${option.type === 'null' ? 'null' : `${keyword}[${index}]`}`,
							},
						],
			),
			...(taken ? otherBranchesOf(taken, path) : []),
		];
	}
	return [
		...Object.entries(schema.properties ?? {}).flatMap(([key, child]) =>
			otherBranchesOf(child, [...path, key]),
		),
		...(schema.items ? otherBranchesOf(schema.items, [...path, 0]) : []),
	];
}

const withValueAt = (
	value: unknown,
	[head, ...rest]: readonly Segment[],
	leaf: unknown,
): unknown => {
	if (head === undefined) return leaf;
	if (head === 0) {
		const list: unknown[] = Array.isArray(value) ? value : [];
		return [withValueAt(list[0], rest, leaf), ...list.slice(1)];
	}
	const record = isRecord(value) ? value : {};
	return { ...record, [head]: withValueAt(record[head], rest, leaf) };
};

/** One fixture for a node with a declared output, with one union branch other than the default. */
export interface DeclaredVariant {
	readonly nodeName: string;
	readonly branch: string;
	readonly items: Array<Record<string, unknown>>;
}

/**
 * One variant for each union option of each declared output that the default fixture does not
 * take, null options first: a run with the default fixture never takes a null path. A variant
 * starts from the first item of `baseItems`, else from the example of the declared output, and
 * sets the one value. A node that `includes` rejects gets no variant.
 */
export function declaredVariants(
	workflow: WorkflowJSON,
	baseItems: (nodeName: string) => ReadonlyArray<Record<string, unknown>> | undefined,
	includes: (nodeName: string) => boolean,
): DeclaredVariant[] {
	const variants = workflow.nodes.flatMap((node) => {
		const schema = declaredOutputOf(node);
		const nodeName = node.name;
		if (!schema || !nodeName || !includes(nodeName)) return [];
		const base = baseItems(nodeName)?.[0] ?? exampleOf(schema);
		return otherBranchesOf(schema).flatMap(({ path, schema: branch, label }) => {
			const item = withValueAt(base, path, exampleOf(branch));
			return isRecord(item)
				? [{ nodeName, branch: label, items: [item], isNull: branch.type === 'null' }]
				: [];
		});
	});
	return [
		...variants.filter(({ isNull }) => isNull),
		...variants.filter(({ isNull }) => !isNull),
	].map(({ nodeName, branch, items }) => ({ nodeName, branch, items }));
}
