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

import type { NodeJSON, WorkflowJSON } from '../types/base';
import { toEngineConnections } from '../utils/workflow-json-engine-helpers';

/** Validation code for each blocking reason of engine v2, e.g. `ENGINE_V2_RETRY_ON_FAIL`. */
export type EngineV2ValidationCode = `ENGINE_V2_${EngineV2ReasonCode}`;

export interface EngineV2SupportIssue {
	code: EngineV2ValidationCode;
	message: string;
	nodeName?: string;
}

const V1_FALLBACK = "set `engineType: 'v1'` in the workflow settings";

/** Node settings that engine v2 does not support yet, but that have a v2 way. */
export type EngineV2NodeSettingCode = Extract<
	EngineV2ReasonCode,
	'RETRY_ON_FAIL' | 'CONTINUE_ERROR_OUTPUT' | 'EXECUTE_ONCE' | 'ALWAYS_OUTPUT_DATA'
>;

export interface EngineV2NodeSettingRule {
	/** The node setting in workflow SDK code. */
	setting: string;
	/** What engine v2 cannot do, the v2 way, and then the v1 fallback. */
	text: string;
}

/**
 * The v2 way for each node setting that engine v2 does not support yet. Validation
 * errors and the builder prompts use the same text, so the model reads one wording.
 * Remove an entry when engine v2 supports the setting.
 */
export const ENGINE_V2_NODE_SETTING_RULES: Record<
	EngineV2NodeSettingCode,
	EngineV2NodeSettingRule
> = {
	RETRY_ON_FAIL: {
		setting: '`retryOnFail: true`',
		text:
			'engine v2 does not support Retry On Fail yet. Remove `retryOnFail`. ' +
			"To continue after a failure, set `onError: 'continueRegularOutput'` and check the result with an IF node. " +
			`If the workflow must retry, ${V1_FALLBACK}.`,
	},
	CONTINUE_ERROR_OUTPUT: {
		setting: "`onError: 'continueErrorOutput'`",
		text:
			"engine v2 does not support the error output (`onError: 'continueErrorOutput'`) yet. " +
			"Set `onError: 'continueRegularOutput'` and connect an IF node that checks for the `error` field in the output. " +
			`If the workflow must have a separate error output, ${V1_FALLBACK}.`,
	},
	EXECUTE_ONCE: {
		setting: '`executeOnce: true`',
		text:
			'engine v2 does not support Execute Once yet. Remove `executeOnce`. ' +
			'To use only the first item, add a Limit node (1 item) before this node. ' +
			'To use all items in one run, add an Aggregate node before this node. The Aggregate node combines the items into one item, so update the expressions of this node. ' +
			`If the workflow must use Execute Once, ${V1_FALLBACK}.`,
	},
	ALWAYS_OUTPUT_DATA: {
		setting: '`alwaysOutputData: true`',
		text:
			'engine v2 does not support Always Output Data yet. Remove `alwaysOutputData`. ' +
			'Make sure that the workflow can stop at this node when the node returns no items. ' +
			`If the next nodes must run when this node returns no items, ${V1_FALLBACK}.`,
	},
};

export function isEngineV2NodeSettingCode(code: string): code is EngineV2NodeSettingCode {
	return Object.hasOwn(ENGINE_V2_NODE_SETTING_RULES, code);
}

/**
 * Selects the engine to validate for. The workflow's `settings.engineType` wins, because
 * it selects the engine that runs the workflow. `engine` applies only to a workflow
 * without one, and v1 applies when both are missing.
 */
export function resolveValidationEngine(
	json: WorkflowJSON,
	engine: WorkflowEngineType | undefined,
): WorkflowEngineType {
	const engineType = json.settings?.engineType;
	if (engineType === 'v1' || engineType === 'v2') return engineType;
	return engine ?? 'v1';
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
 * v2 way, then the v1 fallback. Permanent and invalid reasons already name the fix.
 */
export function formatEngineV2Message(reason: EngineV2Reason): string {
	if (isEngineV2NodeSettingCode(reason.code)) {
		const alternative = ENGINE_V2_NODE_SETTING_RULES[reason.code].text;
		return `${nodePrefix(reason, alternative)}${alternative}`;
	}

	const message = `${nodePrefix(reason, reason.message)}${reason.message}`;
	switch (reason.kind) {
		case 'temporary':
			// The reason text already says to use engine v1 for now.
			return `${message} To do this, ${V1_FALLBACK}.`;
		case 'permanent':
			return message;
		case 'invalid':
			return `${message} Engine v1 cannot run this workflow either.`;
	}
}

/** Names the node only when the text does not name it already. */
function nodePrefix(reason: EngineV2Reason, text: string): string {
	return reason.nodeName && !text.includes(`"${reason.nodeName}"`)
		? `\`${reason.nodeName}\`: `
		: '';
}

function toEligibilityWorkflow(json: WorkflowJSON): EngineV2EligibilityWorkflow {
	return {
		nodes: json.nodes.map(toEngineNode),
		connections: toEngineConnections(json.connections),
		settings: toEngineSettings(json.settings),
	};
}

/**
 * Copies every node field, so a new field that a rule reads reaches the check. The
 * check does not read credentials, and their SDK type does not match the engine type.
 */
function toEngineNode({ name, parameters, credentials: _credentials, ...node }: NodeJSON): INode {
	return {
		...node,
		name: name ?? '',
		// The SDK and the engine type parameters differently. Workflow JSON parameters are
		// plain JSON, so the round trip keeps every value. `jsonParse` does not check the type.
		parameters: jsonParse<INodeParameters>(JSON.stringify(parameters ?? {})),
	};
}

/**
 * Copies every setting, so a new setting that a rule reads reaches the check. The SDK
 * does not type every key, so the values of the other keys are not checked here.
 */
function toEngineSettings(settings: WorkflowJSON['settings']): IWorkflowSettings {
	return { ...settings };
}
