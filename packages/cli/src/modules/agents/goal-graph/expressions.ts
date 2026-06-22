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

/** Normalize a tool output into the `$json` object for output mappings. */
export function toJsonContext(output: unknown): IDataObject {
	const value = toSlotValue(output);
	if (isDataObject(value)) return value;
	return { value };
}
