import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { render } from '@testing-library/vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import EngineV2CompatibilityCallout from './EngineV2CompatibilityCallout.vue';

type Code = EngineCompatibilityReason['code'];
type Kind = EngineCompatibilityReason['kind'];

const V1_ADVICE = 'Run this workflow on engine v1 for now.';

function renderCallout(reasons: EngineCompatibilityReason[]) {
	return render(EngineV2CompatibilityCallout, { props: { reasons } });
}

function reasonTexts(getAllByTestId: (id: string) => HTMLElement[]) {
	return getAllByTestId('engine-v2-compatibility-reason').map((item) => item.textContent?.trim());
}

function reason(
	code: Code,
	kind: Kind,
	overrides: Partial<EngineCompatibilityReason> = {},
): EngineCompatibilityReason {
	return {
		code,
		kind,
		severity: 'blocking',
		message: `Package message for ${code}.`,
		...overrides,
	};
}

/** The codes whose text the editor has: `[code, kind, key]`. */
const OWN_TEXT: Array<[Code, Kind, BaseTextKey]> = [
	['ERROR_WORKFLOW', 'temporary', 'engineV2Compatibility.reason.errorWorkflow'],
	['REDACTION_POLICY', 'temporary', 'engineV2Compatibility.reason.redactionPolicy'],
	['END_USER_CREDENTIALS', 'temporary', 'engineV2Compatibility.reason.endUserCredentials'],
	[
		'TRIGGER_EXTERNAL_IDENTITY',
		'temporary',
		'engineV2Compatibility.reason.triggerExternalIdentity',
	],
	['AI_NODE', 'temporary', 'engineV2Compatibility.reason.aiNode'],
	['CHAT_NODE', 'temporary', 'engineV2Compatibility.reason.chatNode'],
	['COMMUNITY_NODE', 'temporary', 'engineV2Compatibility.reason.communityNode'],
	['EVALUATION_NODE', 'temporary', 'engineV2Compatibility.reason.evaluationNode'],
	['EXECUTION_DATA_NODE', 'temporary', 'engineV2Compatibility.reason.executionDataNode'],
	['FORM_NODE', 'temporary', 'engineV2Compatibility.reason.formNode'],
	['MCP_SERVER_TRIGGER', 'temporary', 'engineV2Compatibility.reason.mcpServerTrigger'],
	['MESSAGE_AN_AGENT_NODE', 'temporary', 'engineV2Compatibility.reason.messageAnAgentNode'],
	[
		'MICROSOFT_AGENT365_TRIGGER',
		'temporary',
		'engineV2Compatibility.reason.microsoftAgent365Trigger',
	],
	['TIME_SAVED_NODE', 'temporary', 'engineV2Compatibility.reason.timeSavedNode'],
	['TRIGGER_WAITS_FOR_RUN', 'temporary', 'engineV2Compatibility.reason.triggerWaitsForRun'],
	['CONTINUE_ERROR_OUTPUT', 'temporary', 'engineV2Compatibility.reason.continueErrorOutput'],
	['MERGE_CHOOSE_BRANCH', 'temporary', 'engineV2Compatibility.reason.mergeChooseBranch'],
	['MERGE_MODE_EXPRESSION', 'permanent', 'engineV2Compatibility.reason.mergeModeExpression'],
	[
		'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION',
		'permanent',
		'engineV2Compatibility.reason.splitInBatchesOptionsExpression',
	],
	['SPLIT_IN_BATCHES_RESET', 'temporary', 'engineV2Compatibility.reason.splitInBatchesReset'],
	[
		'SPLIT_IN_BATCHES_BATCH_SIZE',
		'permanent',
		'engineV2Compatibility.reason.splitInBatchesBatchSize.expression',
	],
	[
		'SPLIT_IN_BATCHES_BATCH_SIZE',
		'invalid',
		'engineV2Compatibility.reason.splitInBatchesBatchSize.invalid',
	],
	[
		'SUB_WORKFLOW_FOR_EACH_ITEM',
		'permanent',
		'engineV2Compatibility.reason.subWorkflowForEachItem',
	],
	[
		'SUB_WORKFLOW_NOT_IN_DATABASE',
		'permanent',
		'engineV2Compatibility.reason.subWorkflowNotInDatabase',
	],
	[
		'CYCLE_WITHOUT_SPLIT_IN_BATCHES',
		'temporary',
		'engineV2Compatibility.reason.cycleWithoutSplitInBatches',
	],
	['LOOP_ENTERED_MID_BODY', 'permanent', 'engineV2Compatibility.reason.loopEnteredMidBody'],
	['LOOP_WITHOUT_RETURN', 'permanent', 'engineV2Compatibility.reason.loopWithoutReturn'],
	['LOOP_INPUT_NOT_FIRST', 'permanent', 'engineV2Compatibility.reason.loopInputNotFirst'],
	[
		'LOOP_DONE_OUTPUT_FEEDS_BODY',
		'permanent',
		'engineV2Compatibility.reason.loopDoneOutputFeedsBody',
	],
	[
		'LOOP_OUTPUT_NOT_DONE_OR_LOOP',
		'invalid',
		'engineV2Compatibility.reason.loopOutputNotDoneOrLoop',
	],
	[
		'NODE_REACHED_ONLY_THROUGH_DISABLED_NODE',
		'invalid',
		'engineV2Compatibility.reason.nodeReachedOnlyThroughDisabledNode',
	],
];

/** The codes whose `message` carries details that a fixed text can't hold. */
const PACKAGE_MESSAGE: Code[] = [
	'NESTED_LOOP',
	'LOOP_EXITS_MID_BODY',
	'LOOP_MULTIPLE_ENTRIES',
	'LOOP_MULTIPLE_RETURNS',
	'INPUT_SLOT_CONVERGENCE',
	'NON_MAIN_CONNECTION',
	'SPLIT_IN_BATCHES_VERSION',
];

describe('EngineV2CompatibilityCallout', () => {
	const i18n = useI18n();

	it('lists every reason', () => {
		const { getAllByTestId } = renderCallout([
			reason('MERGE_MODE_EXPRESSION', 'permanent'),
			reason('LOOP_WITHOUT_RETURN', 'permanent'),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			i18n.baseText('engineV2Compatibility.reason.mergeModeExpression'),
			i18n.baseText('engineV2Compatibility.reason.loopWithoutReturn'),
		]);
	});

	it('shows the node name before the text when the reason has one', () => {
		const { getAllByTestId } = renderCallout([
			reason('LOOP_WITHOUT_RETURN', 'permanent', { nodeId: 'node-1', nodeName: 'Loop Over Items' }),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			`Loop Over Items: ${i18n.baseText('engineV2Compatibility.reason.loopWithoutReturn')}`,
		]);
	});

	it('covers each code once', () => {
		const codes = [...OWN_TEXT.map(([code]) => code), ...PACKAGE_MESSAGE];

		expect(new Set(codes).size).toBe(37);
		expect(OWN_TEXT).toHaveLength(31);
	});

	it.each(OWN_TEXT)('shows its own text for %s (%s)', (code, kind, key) => {
		const { getAllByTestId } = renderCallout([reason(code, kind)]);

		const text = i18n.baseText(key);
		expect(text).not.toBe(key);
		expect(reasonTexts(getAllByTestId)).toEqual([
			kind === 'temporary' ? `${text} ${V1_ADVICE}` : text,
		]);
	});

	it('tells the two meanings of SPLIT_IN_BATCHES_BATCH_SIZE apart', () => {
		const { getAllByTestId } = renderCallout([
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'permanent'),
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'invalid'),
		]);

		const [expression, invalid] = reasonTexts(getAllByTestId);
		expect(expression).not.toBe(invalid);
	});

	it.each(PACKAGE_MESSAGE)('shows the package message for %s, as it comes', (code) => {
		const message = `Details only the package knows. ${V1_ADVICE}`;
		const { getAllByTestId } = renderCallout([reason(code, 'temporary', { message })]);

		expect(reasonTexts(getAllByTestId)).toEqual([message]);
	});

	it('shows the package message for an unknown code', () => {
		const { getAllByTestId } = renderCallout([
			// A newer package can return a code that this editor does not know.
			reason('FUTURE_CODE' as Code, 'permanent', {
				message: 'Engine v2 does not support this.',
			}),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual(['Engine v2 does not support this.']);
	});

	it('uses the blocking title and theme when a reason blocks', () => {
		const { getByTestId } = renderCallout([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
			reason('ERROR_WORKFLOW', 'temporary'),
		]);

		const callout = getByTestId('engine-v2-compatibility-callout');
		expect(callout).toHaveTextContent(i18n.baseText('engineV2Compatibility.callout.title'));
		expect(callout.className).toMatch(/danger/);
	});

	it('uses the warning title and theme when no reason blocks', () => {
		const { getByTestId } = renderCallout([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		const callout = getByTestId('engine-v2-compatibility-callout');
		expect(callout).toHaveTextContent(i18n.baseText('engineV2Compatibility.callout.titleWarnings'));
		expect(callout.className).toMatch(/warning/);
	});
});
