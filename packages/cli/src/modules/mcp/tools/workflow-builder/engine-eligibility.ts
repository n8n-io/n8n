import {
	checkEngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2Reason,
} from '@n8n/workflow-engine-check';
import { isRecord } from '@n8n/utils/is-record';
import { toEngineConnections, type WorkflowJSON } from '@n8n/workflow-sdk';
import type {
	INode,
	INodeParameters,
	IWorkflowSettings,
	NodeParameterValueType,
} from 'n8n-workflow';
import z from 'zod';

import type { EngineType } from '@/workflows/workflow-engine-defaults';

/** Error code of a save refused because the workflow names engine v2 and cannot run on it. */
export const ENGINE_V2_INCOMPATIBLE_ERROR_CODE = 'ENGINE_V2_INCOMPATIBLE';

/** The `engine` field of the validate, create and update tool results. */
export const engineOutputSchema = z
	.object({
		engineType: z.enum(['v1', 'v2']).describe('The execution engine the workflow runs on.'),
		source: z
			.enum(['explicit', 'default', 'downgraded', 'blocked'])
			.describe(
				'How the engine was chosen: "explicit" from settings.engineType, "default" from the instance default, "downgraded" to v1 because engine v2 cannot run the workflow, "blocked" because the workflow names engine v2 and engine v2 cannot run it.',
			),
		reasons: z
			.array(
				z.object({
					code: z.string(),
					kind: z
						.enum(['temporary', 'permanent', 'invalid'])
						.describe(
							'"temporary": engine v2 will support this later. "permanent": engine v2 will never support this. "invalid": the workflow cannot run on any engine.',
						),
					severity: z.enum(['blocking', 'warning']),
					nodeName: z.string().optional(),
					message: z.string(),
				}),
			)
			.optional()
			.describe('Why engine v2 cannot run the workflow, or what it does not fully support yet.'),
		note: z.string().optional().describe('What to do about a downgrade or a block.'),
	})
	.optional()
	.describe(
		'Present only when this instance offers engine v2. Read it after every save: a "downgraded" or "blocked" source needs a decision.',
	);

/** What the instance offers. Both are false/v1 when the engine-v2 module is off. */
export interface EngineContext {
	v2Available: boolean;
	defaultEngineType: EngineType;
}

/** The shape a reason takes in a tool result. Stable: clients key on `code`. */
export interface EngineReasonOutput {
	code: EngineV2Reason['code'];
	kind: EngineV2Reason['kind'];
	severity: EngineV2Reason['severity'];
	nodeName?: string;
	message: string;
}

/**
 * The engine a workflow will run on, and how that was decided.
 *
 * - `explicit`: the workflow names its engine. A named v2 that the check blocks
 *   is a `blocked` decision, because the author asked for something the engine
 *   refuses.
 * - `default`: the workflow names no engine, so it gets the instance default.
 * - `downgraded`: the default is v2, but the check blocks it, so the workflow
 *   is put on v1 and the caller is told why. This is the "v2 if possible, else
 *   v1" rule.
 * - `blocked`: see `explicit`.
 */
export type EngineDecision =
	| { engineType: EngineType; source: 'explicit' | 'default'; reasons: EngineReasonOutput[] }
	| { engineType: 'v1'; source: 'downgraded'; reasons: EngineReasonOutput[] }
	| { engineType: 'v2'; source: 'blocked'; reasons: EngineReasonOutput[] };

/**
 * The parsed SDK output as the check reads it. A node without a name is a sticky
 * note, which runs on no engine, so it is left out; the rules key on node names.
 * The SDK duplicates the workflow types with looser values, so each node is
 * rebuilt field by field rather than cast.
 */
export function toEligibilityWorkflow(
	workflow: Pick<WorkflowJSON, 'nodes' | 'connections' | 'settings'>,
): EngineV2EligibilityWorkflow {
	const nodes: INode[] = [];
	for (const node of workflow.nodes) {
		if (node.name === undefined) continue;
		nodes.push({
			id: node.id,
			name: node.name,
			type: node.type,
			typeVersion: node.typeVersion,
			position: node.position,
			parameters: toNodeParameters(node.parameters ?? {}),
			...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
			...(node.onError !== undefined ? { onError: node.onError } : {}),
		});
	}
	return {
		nodes,
		connections: toEngineConnections(workflow.connections),
		settings: workflow.settings,
	};
}

/**
 * `IDataObject` admits any object where `INodeParameters` admits only parameter
 * values. Every value the SDK parses is JSON, so the walk keeps everything and
 * only narrows the type.
 */
function toNodeParameters(data: Record<string, unknown>): INodeParameters {
	const parameters: INodeParameters = {};
	for (const [key, value] of Object.entries(data)) {
		parameters[key] = toNodeParameterValue(value);
	}
	return parameters;
}

function toNodeParameterValue(value: unknown): NodeParameterValueType {
	if (value === null || value === undefined) return value;
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	if (Array.isArray(value)) {
		// A parameter array holds either values or objects; the check never reads one.
		return value.map((item: unknown) => toNodeParameterValue(item)) as NodeParameterValueType;
	}
	if (isRecord(value)) return toNodeParameters(value);
	return undefined;
}

/** The engine decision for a workflow about to be saved. Inert when v2 is unavailable. */
export function decideEngine(
	workflow: EngineV2EligibilityWorkflow,
	context: EngineContext,
): EngineDecision | undefined {
	if (!context.v2Available) return undefined;

	const requested = workflow.settings?.engineType;
	const engineType = requested ?? context.defaultEngineType;
	const source = requested === undefined ? 'default' : 'explicit';

	if (engineType === 'v1') return { engineType, source, reasons: [] };

	const { eligible, reasons } = checkEngineV2Eligibility(workflow);
	const output = reasons.map(toReasonOutput);
	if (eligible) return { engineType: 'v2', source, reasons: output };

	return source === 'explicit'
		? { engineType: 'v2', source: 'blocked', reasons: output }
		: { engineType: 'v1', source: 'downgraded', reasons: output };
}

/** The settings to save for a decision: a downgrade writes v1 so the default does not undo it. */
export function applyEngineDecision(
	settings: IWorkflowSettings | undefined,
	decision: EngineDecision | undefined,
): IWorkflowSettings | undefined {
	if (decision?.source !== 'downgraded') return settings;
	return { ...(settings ?? {}), engineType: 'v1' };
}

/** The `engine` field of a tool result, for the client to read and act on. */
export function describeEngineDecision(decision: EngineDecision) {
	const blocking = decision.reasons.filter((reason) => reason.severity === 'blocking');
	const note =
		decision.source === 'downgraded'
			? `The workflow is set to engine v1 because engine v2 cannot run it yet. ${summarize(blocking)} Leave it on v1, or change the workflow and set engineType to "v2".`
			: decision.source === 'blocked'
				? `The workflow asks for engine v2, but engine v2 cannot run it. ${summarize(blocking)} Change the workflow, or set engineType to "v1".`
				: undefined;

	return {
		engineType: decision.engineType,
		source: decision.source,
		...(decision.reasons.length > 0 ? { reasons: decision.reasons } : {}),
		...(note ? { note } : {}),
	};
}

export type EngineDecisionOutput = ReturnType<typeof describeEngineDecision>;

function summarize(reasons: EngineReasonOutput[]): string {
	return reasons
		.map((reason) => (reason.nodeName ? `${reason.nodeName}: ${reason.message}` : reason.message))
		.join(' ');
}

function toReasonOutput(reason: EngineV2Reason): EngineReasonOutput {
	return {
		code: reason.code,
		kind: reason.kind,
		severity: reason.severity,
		...(reason.nodeName ? { nodeName: reason.nodeName } : {}),
		message: reason.message,
	};
}
