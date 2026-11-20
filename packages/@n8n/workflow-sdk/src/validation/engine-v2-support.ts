import {
	checkEngineV2Eligibility,
	type EngineV2EligibilityWorkflow,
	type EngineV2Reason,
	type EngineV2ReasonCode,
} from '@n8n/workflow-engine-check';
import {
	jsonParse,
	type INode,
	type INodeParameters,
	type IWorkflowSettings,
	type WorkflowEngineType,
} from 'n8n-workflow';

import type { WorkflowJSON } from '../types/base';
import { toEngineConnections } from '../utils/workflow-json-engine-helpers';

/** Validation code for each blocking reason of engine v2, e.g. `ENGINE_V2_RETRY_ON_FAIL`. */
export type EngineV2ValidationCode = `ENGINE_V2_${EngineV2ReasonCode}`;

export interface EngineV2SupportIssue {
	code: EngineV2ValidationCode;
	message: string;
	nodeName?: string;
}

const V1_FALLBACK = "set `engineType: 'v1'` in the `workflow()` settings";

/**
 * Text for reasons that have a v2 way to get the same result. Each text says what
 * engine v2 cannot do, the v2 way, and then the v1 fallback.
 */
const V2_ALTERNATIVES: Partial<Record<EngineV2ReasonCode, string>> = {
	RETRY_ON_FAIL:
		'engine v2 does not support Retry On Fail yet. Remove `retryOnFail`. ' +
		"To continue after a failure, set `onError: 'continueRegularOutput'` and check the result with an IF node. " +
		`If the workflow must retry, ${V1_FALLBACK}.`,
	CONTINUE_ERROR_OUTPUT:
		"engine v2 does not support the error output (`onError: 'continueErrorOutput'`) yet. " +
		"Set `onError: 'continueRegularOutput'` and connect an IF node that checks for the `error` field in the output. " +
		`If the workflow must have a separate error output, ${V1_FALLBACK}.`,
	EXECUTE_ONCE:
		'engine v2 does not support Execute Once yet. Remove `executeOnce`. ' +
		'Add a Limit node (1 item) or an Aggregate node before this node, so that it gets only one item. ' +
		`If the workflow must use Execute Once, ${V1_FALLBACK}.`,
	ALWAYS_OUTPUT_DATA:
		'engine v2 does not support Always Output Data yet. Remove `alwaysOutputData`. ' +
		'Make sure that the workflow can stop at this node when the node returns no items. ' +
		`If the next nodes must run when this node returns no items, ${V1_FALLBACK}.`,
};

/** Selects the engine to validate for. A workflow without `engineType` runs on engine v1. */
export function resolveValidationEngine(
	json: WorkflowJSON,
	engine: WorkflowEngineType | undefined,
): WorkflowEngineType {
	if (engine) return engine;
	return json.settings?.engineType === 'v2' ? 'v2' : 'v1';
}

/**
 * Returns one issue for each blocking reason that stops engine v2 from running the
 * workflow. Reasons with severity `warning` do not block a run, so they are not returned.
 */
export function findEngineV2SupportIssues(json: WorkflowJSON): EngineV2SupportIssue[] {
	const { reasons } = checkEngineV2Eligibility(toEligibilityWorkflow(json));
	return reasons
		.filter((reason) => reason.severity === 'blocking')
		.map((reason) => ({
			code: `ENGINE_V2_${reason.code}` as const,
			message: formatEngineV2Message(reason),
			nodeName: reason.nodeName,
		}));
}

/**
 * Writes the message in this order: the node name, what engine v2 cannot do, the
 * v2 way, then the v1 fallback.
 */
export function formatEngineV2Message(reason: EngineV2Reason): string {
	const prefix = reason.nodeName ? `\`${reason.nodeName}\`: ` : '';
	const alternative = V2_ALTERNATIVES[reason.code];
	if (alternative) {
		return `${prefix}${alternative}`;
	}

	switch (reason.kind) {
		case 'temporary':
			// The reason text already says to use engine v1 for now.
			return `${prefix}${reason.message} To do this, ${V1_FALLBACK}.`;
		case 'permanent':
			return `${prefix}${reason.message} Engine v2 will not support this. Change the structure of the workflow.`;
		case 'invalid':
			return `${prefix}${reason.message} No engine can run this workflow. Fix the workflow.`;
	}
}

function toEligibilityWorkflow(json: WorkflowJSON): EngineV2EligibilityWorkflow {
	return {
		nodes: json.nodes.map(toEngineNode),
		connections: toEngineConnections(json.connections),
		settings: toEngineSettings(json.settings),
	};
}

function toEngineNode(node: WorkflowJSON['nodes'][number]): INode {
	return {
		id: node.id,
		name: node.name ?? '',
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		// The SDK and the engine type parameters differently. Workflow JSON parameters are
		// plain JSON, so a JSON round trip gives the engine type without a cast.
		parameters: jsonParse<INodeParameters>(JSON.stringify(node.parameters ?? {})),
		disabled: node.disabled,
		retryOnFail: node.retryOnFail,
		alwaysOutputData: node.alwaysOutputData,
		executeOnce: node.executeOnce,
		onError: node.onError,
	};
}

/**
 * Copies only the settings that can block an engine v2 run. The SDK settings allow
 * any key, so each value is checked before it is copied.
 */
function toEngineSettings(settings: WorkflowJSON['settings']): IWorkflowSettings {
	const engineSettings: IWorkflowSettings = {};
	if (typeof settings?.errorWorkflow === 'string') {
		engineSettings.errorWorkflow = settings.errorWorkflow;
	}
	if (typeof settings?.credentialResolverId === 'string') {
		engineSettings.credentialResolverId = settings.credentialResolverId;
	}
	return engineSettings;
}
