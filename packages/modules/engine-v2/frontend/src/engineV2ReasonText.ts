import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type {
	EngineCompatibilityReason,
	EngineCompatibilityReasonCode,
	EngineCompatibilityReasonKind,
} from './engineV2Check';

/** The editor's own text for a reason: what isn't supported, and how to fix it. */
interface ReasonKeys {
	reason: BaseTextKey;
	fix: BaseTextKey;
	/** The name that both texts put in `{setting}`. */
	setting?: BaseTextKey;
}

/**
 * The editor's own text for a code: one pair of keys, one pair for each `kind` when the code has
 * more than one meaning, or `null` to show the package's `message`. Use `null` when the
 * `message` carries details that a fixed text can't hold, such as a second node name or a count.
 */
type ReasonText = ReasonKeys | Partial<Record<EngineCompatibilityReasonKind, ReasonKeys>> | null;

const UNSUPPORTED_NODE: ReasonKeys = {
	reason: 'engineV2Compatibility.reason.unsupportedNode',
	fix: 'engineV2Compatibility.fix.removeNode',
};

/** A node setting that engine v2 can't run yet. The texts use its name from the node settings. */
function unsupportedNodeSetting(setting: BaseTextKey): ReasonKeys {
	return {
		reason: 'engineV2Compatibility.reason.nodeSetting',
		fix: 'engineV2Compatibility.fix.nodeSetting',
		setting,
	};
}

/**
 * Every code of the package has an entry, so the typecheck fails when the package adds a code.
 * A text says what the package's `message` says, without the node name, which the dialog shows.
 * When a package rule changes what its `message` says, change the text in the same PR, or use
 * `null`.
 */
const REASON_TEXT_KEYS: Record<EngineCompatibilityReasonCode, ReasonText> = {
	ERROR_WORKFLOW: {
		reason: 'engineV2Compatibility.reason.errorWorkflow',
		fix: 'engineV2Compatibility.fix.errorWorkflow',
	},
	REDACTION_POLICY: {
		reason: 'engineV2Compatibility.reason.redactionPolicy',
		fix: 'engineV2Compatibility.fix.redactionPolicy',
	},
	END_USER_CREDENTIALS: {
		reason: 'engineV2Compatibility.reason.endUserCredentials',
		fix: 'engineV2Compatibility.fix.endUserCredentials',
	},
	TRIGGER_EXTERNAL_IDENTITY: {
		reason: 'engineV2Compatibility.reason.triggerExternalIdentity',
		fix: 'engineV2Compatibility.fix.temporary',
	},

	AI_NODE: {
		reason: 'engineV2Compatibility.reason.aiNode',
		fix: 'engineV2Compatibility.fix.removeNode',
	},
	COMMUNITY_NODE: {
		reason: 'engineV2Compatibility.reason.communityNode',
		fix: 'engineV2Compatibility.fix.removeNode',
	},
	CHAT_NODE: UNSUPPORTED_NODE,
	EVALUATION_NODE: UNSUPPORTED_NODE,
	EXECUTION_DATA_NODE: UNSUPPORTED_NODE,
	FORM_NODE: UNSUPPORTED_NODE,
	MCP_SERVER_TRIGGER: UNSUPPORTED_NODE,
	MESSAGE_AN_AGENT_NODE: UNSUPPORTED_NODE,
	MICROSOFT_AGENT365_TRIGGER: UNSUPPORTED_NODE,
	TIME_SAVED_NODE: UNSUPPORTED_NODE,
	TRIGGER_WAITS_FOR_RUN: UNSUPPORTED_NODE,

	CONTINUE_ERROR_OUTPUT: {
		reason: 'engineV2Compatibility.reason.continueErrorOutput',
		fix: 'engineV2Compatibility.fix.continueErrorOutput',
	},
	RETRY_ON_FAIL: unsupportedNodeSetting('nodeSettings.retryOnFail.displayName'),
	ALWAYS_OUTPUT_DATA: unsupportedNodeSetting('nodeSettings.alwaysOutputData.displayName'),
	EXECUTE_ONCE: unsupportedNodeSetting('nodeSettings.executeOnce.displayName'),
	MERGE_CHOOSE_BRANCH: {
		reason: 'engineV2Compatibility.reason.mergeChooseBranch',
		fix: 'engineV2Compatibility.fix.mergeChooseBranch',
	},
	MERGE_MODE_EXPRESSION: {
		reason: 'engineV2Compatibility.reason.mergeModeExpression',
		fix: 'engineV2Compatibility.fix.mergeModeExpression',
	},
	SPLIT_IN_BATCHES_VERSION: null,
	SPLIT_IN_BATCHES_OPTIONS_EXPRESSION: {
		reason: 'engineV2Compatibility.reason.splitInBatchesOptionsExpression',
		fix: 'engineV2Compatibility.fix.splitInBatchesOptionsExpression',
	},
	SPLIT_IN_BATCHES_RESET: {
		reason: 'engineV2Compatibility.reason.splitInBatchesReset',
		fix: 'engineV2Compatibility.fix.splitInBatchesReset',
	},
	SPLIT_IN_BATCHES_BATCH_SIZE: {
		permanent: {
			reason: 'engineV2Compatibility.reason.splitInBatchesBatchSize.expression',
			fix: 'engineV2Compatibility.fix.splitInBatchesBatchSize.expression',
		},
		invalid: {
			reason: 'engineV2Compatibility.reason.splitInBatchesBatchSize.invalid',
			fix: 'engineV2Compatibility.fix.splitInBatchesBatchSize.invalid',
		},
	},
	NON_MAIN_CONNECTION: null,
	SUB_WORKFLOW_FOR_EACH_ITEM: {
		reason: 'engineV2Compatibility.reason.subWorkflowForEachItem',
		fix: 'engineV2Compatibility.fix.subWorkflowForEachItem',
	},
	SUB_WORKFLOW_NOT_IN_DATABASE: {
		reason: 'engineV2Compatibility.reason.subWorkflowNotInDatabase',
		fix: 'engineV2Compatibility.fix.subWorkflowNotInDatabase',
	},

	CYCLE_WITHOUT_SPLIT_IN_BATCHES: {
		reason: 'engineV2Compatibility.reason.cycleWithoutSplitInBatches',
		fix: 'engineV2Compatibility.fix.cycleWithoutSplitInBatches',
	},
	LOOP_ENTERED_MID_BODY: {
		reason: 'engineV2Compatibility.reason.loopEnteredMidBody',
		fix: 'engineV2Compatibility.fix.loopEnteredMidBody',
	},
	LOOP_MULTIPLE_ENTRIES: null,
	LOOP_MULTIPLE_RETURNS: null,
	NESTED_LOOP: null,
	LOOP_EXITS_MID_BODY: null,
	INPUT_SLOT_CONVERGENCE: null,
	NODE_REACHED_ONLY_THROUGH_DISABLED_NODE: {
		reason: 'engineV2Compatibility.reason.nodeReachedOnlyThroughDisabledNode',
		fix: 'engineV2Compatibility.fix.nodeReachedOnlyThroughDisabledNode',
	},
	LOOP_DONE_OUTPUT_FEEDS_BODY: {
		reason: 'engineV2Compatibility.reason.loopDoneOutputFeedsBody',
		fix: 'engineV2Compatibility.fix.loopDoneOutputFeedsBody',
	},
	LOOP_INPUT_NOT_FIRST: {
		reason: 'engineV2Compatibility.reason.loopInputNotFirst',
		fix: 'engineV2Compatibility.fix.loopInputNotFirst',
	},
	LOOP_OUTPUT_NOT_DONE_OR_LOOP: {
		reason: 'engineV2Compatibility.reason.loopOutputNotDoneOrLoop',
		fix: 'engineV2Compatibility.fix.loopOutputNotDoneOrLoop',
	},
	LOOP_WITHOUT_RETURN: {
		reason: 'engineV2Compatibility.reason.loopWithoutReturn',
		fix: 'engineV2Compatibility.fix.loopWithoutReturn',
	},
};

function isReasonKeys(text: NonNullable<ReasonText>): text is ReasonKeys {
	return 'reason' in text;
}

function textKeys({ code, kind }: EngineCompatibilityReason): ReasonKeys | undefined {
	// `?? null` covers a code from a newer package than this map knows.
	const text = REASON_TEXT_KEYS[code] ?? null;
	if (text === null) return undefined;
	return isReasonKeys(text) ? text : text[kind];
}

/**
 * The text of one reason, how to fix it, and the node name to show before it. A reason shown
 * with the package's `message` has no separate fix, because the `message` already gives the
 * advice. It gets no node name when the `message` already names the node.
 */
export function describeCompatibilityReason(reason: EngineCompatibilityReason): {
	nodeName?: string;
	text: string;
	fix?: string;
} {
	const keys = textKeys(reason);
	if (!keys) {
		const { nodeName, message } = reason;
		return nodeName && !message.includes(`"${nodeName}"`)
			? { nodeName, text: message }
			: { text: message };
	}

	const i18n = useI18n();
	const options = keys.setting
		? { interpolate: { setting: i18n.baseText(keys.setting) } }
		: undefined;
	return {
		nodeName: reason.nodeName,
		text: i18n.baseText(keys.reason, options),
		fix: i18n.baseText(keys.fix, options),
	};
}
