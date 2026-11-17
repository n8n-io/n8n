import { useI18n, type BaseTextKey } from '@n8n/i18n';

import type { EngineCompatibilityReason } from './engineV2Check';

/**
 * The editor's own text for a reason, by `code`, or by `code.kind` when one code has more than
 * one meaning. The text says what the package's `message` says, without the node name and
 * without the engine v1 advice, which the callout adds.
 *
 * A code that has no entry shows the package's `message`. That covers a code that the editor
 * doesn't know yet, and a code whose `message` carries details that a fixed text can't hold,
 * such as a second node name or a count.
 *
 * To give a code its own text, add an entry here and its key to `en.json`. When a package rule
 * changes what its `message` says, change the text in the same PR, or remove the entry.
 */
const REASON_TEXT_KEYS: Partial<Record<string, BaseTextKey>> = {
	ERROR_WORKFLOW: 'engineV2Compatibility.reason.errorWorkflow',
	REDACTION_POLICY: 'engineV2Compatibility.reason.redactionPolicy',
	END_USER_CREDENTIALS: 'engineV2Compatibility.reason.endUserCredentials',
	TRIGGER_EXTERNAL_IDENTITY: 'engineV2Compatibility.reason.triggerExternalIdentity',

	AI_NODE: 'engineV2Compatibility.reason.aiNode',
	CHAT_NODE: 'engineV2Compatibility.reason.chatNode',
	COMMUNITY_NODE: 'engineV2Compatibility.reason.communityNode',
	EVALUATION_NODE: 'engineV2Compatibility.reason.evaluationNode',
	EXECUTION_DATA_NODE: 'engineV2Compatibility.reason.executionDataNode',
	FORM_NODE: 'engineV2Compatibility.reason.formNode',
	MCP_SERVER_TRIGGER: 'engineV2Compatibility.reason.mcpServerTrigger',
	MESSAGE_AN_AGENT_NODE: 'engineV2Compatibility.reason.messageAnAgentNode',
	MICROSOFT_AGENT365_TRIGGER: 'engineV2Compatibility.reason.microsoftAgent365Trigger',
	TIME_SAVED_NODE: 'engineV2Compatibility.reason.timeSavedNode',
	TRIGGER_WAITS_FOR_RUN: 'engineV2Compatibility.reason.triggerWaitsForRun',

	CONTINUE_ERROR_OUTPUT: 'engineV2Compatibility.reason.continueErrorOutput',
	MERGE_CHOOSE_BRANCH: 'engineV2Compatibility.reason.mergeChooseBranch',
	MERGE_MODE_EXPRESSION: 'engineV2Compatibility.reason.mergeModeExpression',
	SPLIT_IN_BATCHES_OPTIONS_EXPRESSION:
		'engineV2Compatibility.reason.splitInBatchesOptionsExpression',
	SPLIT_IN_BATCHES_RESET: 'engineV2Compatibility.reason.splitInBatchesReset',
	'SPLIT_IN_BATCHES_BATCH_SIZE.permanent':
		'engineV2Compatibility.reason.splitInBatchesBatchSize.expression',
	'SPLIT_IN_BATCHES_BATCH_SIZE.invalid':
		'engineV2Compatibility.reason.splitInBatchesBatchSize.invalid',
	SUB_WORKFLOW_FOR_EACH_ITEM: 'engineV2Compatibility.reason.subWorkflowForEachItem',
	SUB_WORKFLOW_NOT_IN_DATABASE: 'engineV2Compatibility.reason.subWorkflowNotInDatabase',

	CYCLE_WITHOUT_SPLIT_IN_BATCHES: 'engineV2Compatibility.reason.cycleWithoutSplitInBatches',
	LOOP_ENTERED_MID_BODY: 'engineV2Compatibility.reason.loopEnteredMidBody',
	LOOP_WITHOUT_RETURN: 'engineV2Compatibility.reason.loopWithoutReturn',
	LOOP_INPUT_NOT_FIRST: 'engineV2Compatibility.reason.loopInputNotFirst',
	LOOP_DONE_OUTPUT_FEEDS_BODY: 'engineV2Compatibility.reason.loopDoneOutputFeedsBody',
	LOOP_OUTPUT_NOT_DONE_OR_LOOP: 'engineV2Compatibility.reason.loopOutputNotDoneOrLoop',
	NODE_REACHED_ONLY_THROUGH_DISABLED_NODE:
		'engineV2Compatibility.reason.nodeReachedOnlyThroughDisabledNode',
};

/** The text of one reason, without its node name. */
export function describeCompatibilityReason(reason: EngineCompatibilityReason): string {
	const key = REASON_TEXT_KEYS[`${reason.code}.${reason.kind}`] ?? REASON_TEXT_KEYS[reason.code];
	// The package's `message` already ends with the engine v1 advice for a temporary reason.
	if (!key) return reason.message;

	const i18n = useI18n();
	const text = i18n.baseText(key);
	return reason.kind === 'temporary'
		? `${text} ${i18n.baseText('engineV2Compatibility.kind.temporary')}`
		: text;
}
