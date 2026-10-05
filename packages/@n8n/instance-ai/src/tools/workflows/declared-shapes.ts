import { wrapUntrustedData } from '@n8n/agents';
import { validate, type JsonSchema } from '@n8n/node-sdk';
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
 */
const expectingAll = (schema: JsonSchema): JsonSchema => ({
	...schema,
	...(schema.properties
		? {
				properties: Object.fromEntries(
					Object.entries(schema.properties).map(([key, child]) => [key, expectingAll(child)]),
				),
				required: schema.required ?? Object.keys(schema.properties),
			}
		: {}),
	...(schema.items ? { items: expectingAll(schema.items) } : {}),
	...(schema.anyOf ? { anyOf: schema.anyOf.map(expectingAll) } : {}),
	...(schema.oneOf ? { oneOf: schema.oneOf.map(expectingAll) } : {}),
	...(isRecord(schema.additionalProperties)
		? { additionalProperties: expectingAll(schema.additionalProperties) }
		: {}),
});

/** The items of the first output that a check can read: no truncated item and no error item. */
function checkedItemsOf(output: NodeOutputResult): Array<Record<string, unknown>> {
	return (output.outputs[0]?.items ?? [])
		.map((item) => (typeof item === 'string' ? unwrapUntrustedData(item) : item))
		.filter(
			(item): item is Record<string, unknown> =>
				isRecord(item) &&
				item._truncatedItem !== true &&
				!(Object.keys(item).length === 1 && 'error' in item),
		);
}

/** Each issue once, with list indexes left out, e.g. `$json.issues[].title: missing`. */
function driftIssues(items: ReadonlyArray<Record<string, unknown>>, schema: JsonSchema) {
	const expected = expectingAll(schema);
	return [
		...new Set(
			items.flatMap((item) =>
				validate(item, expected, { path: '$json' }).map((issue) =>
					issue.replace(/\[\d+\]/g, '[]').replace(/: is required$/, ': missing'),
				),
			),
		),
	];
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
