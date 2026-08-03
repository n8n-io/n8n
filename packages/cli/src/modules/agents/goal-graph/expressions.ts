import type {
	IDataObject,
	INode,
	INodeProperties,
	INodeType,
	INodeTypes,
	IVersionedNodeType,
} from 'n8n-workflow';
import { createEmptyRunExecutionData, deepCopy, Workflow } from 'n8n-workflow';

import type { SlotValues } from './types';

/**
 * Goal-graph expressions (`achievedWhen`, bindings, output mappings, …) are
 * regular n8n expressions evaluated outside any workflow execution, against:
 *
 * - `$state` — the thread's current slot values
 * - `$json`  — the tool output (output mappings only)
 *
 * The stub workflow mirrors the production pattern in
 * `packages/cli/src/credentials-helper.ts` (mock node + mock node types).
 * Evaluation is synchronous and fails soft: any expression error yields
 * `undefined`, which derives as "condition not met" — never a thrown error
 * inside the agent loop.
 */

const GOAL_GRAPH_NODE_NAME = 'GoalGraph';
const GOAL_GRAPH_NODE_TYPE = 'n8n-internal.goalGraph';

const stubNode: INode = {
	id: 'goal-graph',
	name: GOAL_GRAPH_NODE_NAME,
	typeVersion: 1,
	type: GOAL_GRAPH_NODE_TYPE,
	position: [0, 0],
	parameters: {},
};

const stubNodeType = {
	description: { properties: [] as INodeProperties[] },
} as INodeType;

const stubNodeTypes: INodeTypes = {
	getKnownTypes(): IDataObject {
		return {};
	},
	getByName(): INodeType | IVersionedNodeType {
		return stubNodeType;
	},
	getByNameAndVersion(): INodeType {
		return stubNodeType;
	},
};

let stubWorkflow: Workflow | undefined;

function getStubWorkflow(): Workflow {
	stubWorkflow ??= new Workflow({
		nodes: [stubNode],
		connections: {},
		active: false,
		nodeTypes: stubNodeTypes,
	});
	return stubWorkflow;
}

export interface GoalExpressionContext {
	state: SlotValues;
	/** Tool output, exposed as `$json`. Only set for output mappings. */
	json?: IDataObject;
}

/**
 * Evaluate a goal-graph expression. Accepts both `={{ … }}` and `{{ … }}`
 * forms (the leading `=` is added when missing). Returns `undefined` on any
 * evaluation error.
 */
export function evaluateGoalExpression(
	expression: string,
	context: GoalExpressionContext,
): unknown {
	const normalized = expression.startsWith('=') ? expression : `=${expression}`;
	try {
		return getStubWorkflow().expression.resolveSimpleParameterValue(
			normalized,
			{},
			createEmptyRunExecutionData(),
			0,
			0,
			GOAL_GRAPH_NODE_NAME,
			[{ json: context.json ?? {} }],
			'internal',
			{ $state: context.state },
		);
	} catch {
		return undefined;
	}
}

export function isTruthy(value: unknown): boolean {
	return Boolean(value);
}

/**
 * Normalize an arbitrary runtime value into a JSON-safe slot value (the state
 * is persisted in thread metadata). Non-serializable values (functions,
 * symbols, cycles) become `null` early instead of failing at persist time.
 */
export function toSlotValue(value: unknown): SlotValues[string] {
	if (value === undefined || value === null) return null;
	if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
		return null;
	}
	try {
		// Throws on cyclic structures; deepCopy below has JSON semantics.
		JSON.stringify(value);
		return deepCopy(value) as SlotValues[string];
	} catch {
		return null;
	}
}

function isDataObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalize a tool output into the `$json` object that output-mapping
 * expressions (`={{ $json.id }}`) read. Tools return data in several shapes —
 * this makes `$json` see the meaningful row regardless of tool type:
 *
 * - a plain object → used directly (custom tools);
 * - a JSON string (`return JSON.stringify(...)`) → parsed;
 * - an n8n sub-workflow envelope `{ executionId, status, data: { <node>: [rows] } }`
 *   (workflow tools) → the last node's first row;
 * - an n8n item array `[{ json: {...} }]` or `[ {...} ]` → first element;
 * - a `{ json: {...} }` envelope → the inner object.
 *
 * Anything else is exposed as `{ value: <output> }` so `$json.value` still works.
 */
export function toJsonContext(output: unknown): IDataObject {
	let value: unknown = output;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
			try {
				value = JSON.parse(trimmed);
			} catch {
				// Not JSON — keep the raw string, exposed below as `{ value }`.
			}
		}
	}

	// Workflow-tool envelope: unwrap to the last node's first output row so
	// `$json.<field>` reads the workflow's actual result, not the wrapper.
	if (
		isDataObject(value) &&
		isDataObject(value.data) &&
		('executionId' in value || 'status' in value)
	) {
		const nodeOutputs = Object.values(value.data).filter((o): o is unknown[] => Array.isArray(o));
		const lastRows = nodeOutputs[nodeOutputs.length - 1];
		if (lastRows && lastRows.length > 0) {
			value = lastRows[0];
		}
	}

	if (Array.isArray(value) && value.length > 0) {
		value = value[0];
	}

	if (isDataObject(value) && isDataObject(value.json)) {
		value = value.json;
	}

	const normalized = toSlotValue(value);
	if (isDataObject(normalized)) return normalized;
	return { value: normalized };
}
