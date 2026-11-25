import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type {
	EngineCompatibilityReason,
	EngineCompatibilityReasonCode,
	EngineCompatibilityReasonKind,
} from './engineV2Check';

/**
 * The editor's own text for a code: one key, one key for each `kind` when the code has more
 * than one meaning, or `null` to show the package's `message`. Use `null` when the `message`
 * carries details that a fixed text can't hold, such as a second node name or a count.
 */
type ReasonText = BaseTextKey | Partial<Record<EngineCompatibilityReasonKind, BaseTextKey>> | null;

/**
 * Every code of the package has an entry, so the typecheck fails when the package adds a code.
 * A text says what the package's `message` says, without the node name, which the dialog
 * shows, and without the engine v1 advice, which `describeCompatibilityReason` adds. When a
 * package rule changes what its `message` says, change the text in the same PR, or use `null`.
 */
const REASON_TEXT_KEYS: Record<EngineCompatibilityReasonCode, ReasonText> = {
	ERROR_WORKFLOW: 'engineV2Compatibility.reason.errorWorkflow',
	REDACTION_POLICY: 'engineV2Compatibility.reason.redactionPolicy',
	END_USER_CREDENTIALS: 'engineV2Compatibility.reason.endUserCredentials',
	TRIGGER_EXTERNAL_IDENTITY: 'engineV2Compatibility.reason.triggerExternalIdentity',

	AI_NODE: 'engineV2Compatibility.reason.aiNode',
	COMMUNITY_NODE: 'engineV2Compatibility.reason.communityNode',
	CHAT_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	EVALUATION_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	EXECUTION_DATA_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	FORM_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	MCP_SERVER_TRIGGER: 'engineV2Compatibility.reason.unsupportedNode',
	MESSAGE_AN_AGENT_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	MICROSOFT_AGENT365_TRIGGER: 'engineV2Compatibility.reason.unsupportedNode',
	TIME_SAVED_NODE: 'engineV2Compatibility.reason.unsupportedNode',
	TRIGGER_WAITS_FOR_RUN: 'engineV2Compatibility.reason.unsupportedNode',

	CONTINUE_ERROR_OUTPUT: 'engineV2Compatibility.reason.continueErrorOutput',
	RETRY_ON_FAIL: 'engineV2Compatibility.reason.retryOnFail',
	ALWAYS_OUTPUT_DATA: 'engineV2Compatibility.reason.alwaysOutputData',
	EXECUTE_ONCE: 'engineV2Compatibility.reason.executeOnce',
	MERGE_CHOOSE_BRANCH: 'engineV2Compatibility.reason.mergeChooseBranch',
	MERGE_MODE_EXPRESSION: 'engineV2Compatibility.reason.mergeModeExpression',
	SPLIT_IN_BATCHES_VERSION: null,
	SPLIT_IN_BATCHES_OPTIONS_EXPRESSION:
		'engineV2Compatibility.reason.splitInBatchesOptionsExpression',
	SPLIT_IN_BATCHES_RESET: 'engineV2Compatibility.reason.splitInBatchesReset',
	SPLIT_IN_BATCHES_BATCH_SIZE: {
		permanent: 'engineV2Compatibility.reason.splitInBatchesBatchSize.expression',
		invalid: 'engineV2Compatibility.reason.splitInBatchesBatchSize.invalid',
	},
	NON_MAIN_CONNECTION: null,
	SUB_WORKFLOW_FOR_EACH_ITEM: 'engineV2Compatibility.reason.subWorkflowForEachItem',
	SUB_WORKFLOW_NOT_IN_DATABASE: 'engineV2Compatibility.reason.subWorkflowNotInDatabase',

	CYCLE_WITHOUT_SPLIT_IN_BATCHES: 'engineV2Compatibility.reason.cycleWithoutSplitInBatches',
	LOOP_ENTERED_MID_BODY: 'engineV2Compatibility.reason.loopEnteredMidBody',
	LOOP_MULTIPLE_ENTRIES: null,
	LOOP_MULTIPLE_RETURNS: null,
	NESTED_LOOP: null,
	LOOP_EXITS_MID_BODY: null,
	INPUT_SLOT_CONVERGENCE: null,
	NODE_REACHED_ONLY_THROUGH_DISABLED_NODE:
		'engineV2Compatibility.reason.nodeReachedOnlyThroughDisabledNode',
	LOOP_DONE_OUTPUT_FEEDS_BODY: 'engineV2Compatibility.reason.loopDoneOutputFeedsBody',
	LOOP_INPUT_NOT_FIRST: 'engineV2Compatibility.reason.loopInputNotFirst',
	LOOP_OUTPUT_NOT_DONE_OR_LOOP: 'engineV2Compatibility.reason.loopOutputNotDoneOrLoop',
	LOOP_WITHOUT_RETURN: 'engineV2Compatibility.reason.loopWithoutReturn',
};

function textKey({ code, kind }: EngineCompatibilityReason): BaseTextKey | undefined {
	// `?? null` covers a code from a newer package than this map knows.
	const text = REASON_TEXT_KEYS[code] ?? null;
	if (text === null) return undefined;
	return typeof text === 'string' ? text : text[kind];
}

/**
 * The text of one reason, and the node name to show before it. A reason shown with the
 * package's `message` gets no node name when the `message` already names the node.
 */
export function describeCompatibilityReason(reason: EngineCompatibilityReason): {
	nodeName?: string;
	text: string;
} {
	const key = textKey(reason);
	// The package's `message` already ends with the engine v1 advice for a temporary reason.
	if (!key) {
		const { nodeName, message } = reason;
		return nodeName && !message.includes(`"${nodeName}"`)
			? { nodeName, text: message }
			: { text: message };
	}

	const i18n = useI18n();
	const text = i18n.baseText(key);
	return {
		nodeName: reason.nodeName,
		text:
			reason.kind === 'temporary'
				? `${text} ${i18n.baseText('engineV2Compatibility.kind.temporary')}`
				: text,
	};
}
