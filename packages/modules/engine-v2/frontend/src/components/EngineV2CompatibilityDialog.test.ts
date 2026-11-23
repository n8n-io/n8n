import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { render } from '@testing-library/vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import EngineV2CompatibilityDialog from './EngineV2CompatibilityDialog.vue';

type Code = EngineCompatibilityReason['code'];
type Kind = EngineCompatibilityReason['kind'];

const V1_ADVICE = 'Run this workflow on Engine v1 for now.';

// The dialog renders into `document.body`, where the queries of `render` look, after the mount.
async function renderDialog(reasons: EngineCompatibilityReason[]) {
	const result = render(EngineV2CompatibilityDialog, { props: { reasons, open: true } });
	await result.findByTestId('engine-v2-compatibility-dialog');
	return result;
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
	['CHAT_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['COMMUNITY_NODE', 'temporary', 'engineV2Compatibility.reason.communityNode'],
	['EVALUATION_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['EXECUTION_DATA_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['FORM_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['MCP_SERVER_TRIGGER', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['MESSAGE_AN_AGENT_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['MICROSOFT_AGENT365_TRIGGER', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['TIME_SAVED_NODE', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['TRIGGER_WAITS_FOR_RUN', 'temporary', 'engineV2Compatibility.reason.unsupportedNode'],
	['CONTINUE_ERROR_OUTPUT', 'temporary', 'engineV2Compatibility.reason.continueErrorOutput'],
	['RETRY_ON_FAIL', 'temporary', 'engineV2Compatibility.reason.retryOnFail'],
	['ALWAYS_OUTPUT_DATA', 'temporary', 'engineV2Compatibility.reason.alwaysOutputData'],
	['EXECUTE_ONCE', 'temporary', 'engineV2Compatibility.reason.executeOnce'],
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

describe('EngineV2CompatibilityDialog', () => {
	const i18n = useI18n();

	it('lists every reason', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('MERGE_MODE_EXPRESSION', 'permanent'),
			reason('LOOP_WITHOUT_RETURN', 'permanent'),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			i18n.baseText('engineV2Compatibility.reason.mergeModeExpression'),
			i18n.baseText('engineV2Compatibility.reason.loopWithoutReturn'),
		]);
	});

	it('shows the node name before the text when the reason has one', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('LOOP_WITHOUT_RETURN', 'permanent', { nodeId: 'node-1', nodeName: 'Loop Over Items' }),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			`Loop Over Items: ${i18n.baseText('engineV2Compatibility.reason.loopWithoutReturn')}`,
		]);
	});

	it.each(OWN_TEXT)('shows its own text for %s (%s)', async (code, kind, key) => {
		const { getAllByTestId } = await renderDialog([reason(code, kind)]);

		const text = i18n.baseText(key);
		expect(text).not.toBe(key);
		expect(reasonTexts(getAllByTestId)).toEqual([
			kind === 'temporary' ? `${text} ${V1_ADVICE}` : text,
		]);
	});

	it('tells the two meanings of SPLIT_IN_BATCHES_BATCH_SIZE apart', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'permanent'),
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'invalid'),
		]);

		const [expression, invalid] = reasonTexts(getAllByTestId);
		expect(expression).not.toBe(invalid);
	});

	it.each(PACKAGE_MESSAGE)('shows the package message for %s, as it comes', async (code) => {
		const message = `Details only the package knows. ${V1_ADVICE}`;
		const { getAllByTestId } = await renderDialog([reason(code, 'temporary', { message })]);

		expect(reasonTexts(getAllByTestId)).toEqual([message]);
	});

	it('shows no node name before a package message that already names the node', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('NESTED_LOOP', 'temporary', {
				nodeName: 'Inner',
				message: 'The loop of "Inner" is inside the loop of "Outer".',
			}),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			'The loop of "Inner" is inside the loop of "Outer".',
		]);
	});

	it('shows the node name before a package message that does not name the node', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('NESTED_LOOP', 'temporary', { nodeName: 'Inner', message: "Loops can't nest yet." }),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual(["Inner: Loops can't nest yet."]);
	});

	it('shows the package message for an unknown code', async () => {
		const { getAllByTestId } = await renderDialog([
			// A newer package can return a code that this editor does not know.
			reason('FUTURE_CODE' as Code, 'permanent', {
				message: 'Engine v2 does not support this.',
			}),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual(['Engine v2 does not support this.']);
	});

	it('uses the blocking title when a reason blocks', async () => {
		const { getByTestId } = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
			reason('ERROR_WORKFLOW', 'temporary'),
		]);

		expect(getByTestId('engine-v2-compatibility-dialog')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.title'),
		);
	});

	it('explains the list, and how to publish, when a reason blocks', async () => {
		const { getByTestId } = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
			reason('ERROR_WORKFLOW', 'temporary'),
		]);

		expect(getByTestId('engine-v2-compatibility-intro')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.intro'),
		);
	});

	it('explains the list of warnings when no reason blocks', async () => {
		const { getByTestId } = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		expect(getByTestId('engine-v2-compatibility-intro')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.introWarnings'),
		);
	});

	it('shows the introduction before the list', async () => {
		const { getByTestId, getAllByTestId } = await renderDialog([
			reason('ERROR_WORKFLOW', 'temporary'),
		]);

		const [firstReason] = getAllByTestId('engine-v2-compatibility-reason');
		expect(
			getByTestId('engine-v2-compatibility-intro').compareDocumentPosition(firstReason) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it('uses the warning title when no reason blocks', async () => {
		const { getByTestId } = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		expect(getByTestId('engine-v2-compatibility-dialog')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.titleWarnings'),
		);
	});

	it('gives each entry the icon of its severity', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('ERROR_WORKFLOW', 'temporary'),
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		const icons = getAllByTestId('engine-v2-compatibility-reason').map((item) =>
			item.querySelector('[data-icon]')?.getAttribute('data-icon'),
		);
		expect(icons).toEqual(['circle-x', 'triangle-alert']);
	});

	it('lists blocking reasons first, each group in the order of the check', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('ERROR_WORKFLOW', 'temporary', { severity: 'warning', nodeName: 'A' }),
			reason('ERROR_WORKFLOW', 'temporary', { nodeName: 'B' }),
			reason('ERROR_WORKFLOW', 'temporary', { severity: 'warning', nodeName: 'C' }),
			reason('ERROR_WORKFLOW', 'temporary', { nodeName: 'D' }),
		]);

		const names = getAllByTestId('engine-v2-compatibility-reason').map(
			(item) => item.querySelector('strong')?.textContent,
		);
		expect(names).toEqual(['B: ', 'D: ', 'A: ', 'C: ']);
	});

	it('puts a long list in the scrolling body of the dialog', async () => {
		const reasons = Array.from({ length: 60 }, (_, index) =>
			reason('FORM_NODE', 'temporary', { nodeName: `Form ${index}` }),
		);
		const { getAllByTestId, baseElement } = await renderDialog(reasons);

		const body = baseElement.querySelector('[data-slot="dialog-body"]');
		const items = getAllByTestId('engine-v2-compatibility-reason');
		expect(items).toHaveLength(60);
		expect(items.every((item) => body?.contains(item))).toBe(true);
	});
});
