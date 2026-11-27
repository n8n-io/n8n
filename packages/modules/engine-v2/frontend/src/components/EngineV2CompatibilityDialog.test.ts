import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { fireEvent, render, waitFor } from '@testing-library/vue';

import type { EngineCompatibilityReason } from '../engineV2Check';
import { groupEngineV2Reasons } from '../engineV2Findings';
import EngineV2CompatibilityDialog from './EngineV2CompatibilityDialog.vue';

type Code = EngineCompatibilityReason['code'];
type Kind = EngineCompatibilityReason['kind'];

// The dialog renders into `document.body`, where the queries of `render` look, after the mount.
async function renderDialog(
	reasons: EngineCompatibilityReason[],
	props: { canSwitchToV1?: boolean; switching?: boolean } = {},
) {
	const result = render(EngineV2CompatibilityDialog, {
		props: { groups: groupEngineV2Reasons(reasons), open: true, ...props },
	});
	await result.findByTestId('engine-v2-compatibility-dialog');
	return result;
}

/** The text of each finding: what isn't supported, then how to fix it, on separate lines. */
function reasonTexts(getAllByTestId: (id: string) => HTMLElement[]) {
	return getAllByTestId('engine-v2-compatibility-reason').map((item) =>
		[...item.querySelectorAll('p')].map((line) => line.textContent?.trim()).join('\n'),
	);
}

function groupTitles(getAllByTestId: (id: string) => HTMLElement[]) {
	return getAllByTestId('engine-v2-compatibility-group-title').map((title) =>
		title.textContent?.trim(),
	);
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

/** The codes whose text the editor has: `[code, kind, reason key, fix key]`. */
const OWN_TEXT: Array<[Code, Kind, BaseTextKey, BaseTextKey]> = [
	[
		'ERROR_WORKFLOW',
		'temporary',
		'engineV2Compatibility.reason.errorWorkflow',
		'engineV2Compatibility.fix.errorWorkflow',
	],
	[
		'REDACTION_POLICY',
		'temporary',
		'engineV2Compatibility.reason.redactionPolicy',
		'engineV2Compatibility.fix.redactionPolicy',
	],
	[
		'END_USER_CREDENTIALS',
		'temporary',
		'engineV2Compatibility.reason.endUserCredentials',
		'engineV2Compatibility.fix.endUserCredentials',
	],
	[
		'TRIGGER_EXTERNAL_IDENTITY',
		'temporary',
		'engineV2Compatibility.reason.triggerExternalIdentity',
		'engineV2Compatibility.fix.temporary',
	],
	[
		'AI_NODE',
		'temporary',
		'engineV2Compatibility.reason.aiNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'CHAT_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'COMMUNITY_NODE',
		'temporary',
		'engineV2Compatibility.reason.communityNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'EVALUATION_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'EXECUTION_DATA_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'FORM_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'MCP_SERVER_TRIGGER',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'MESSAGE_AN_AGENT_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'MICROSOFT_AGENT365_TRIGGER',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'TIME_SAVED_NODE',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'TRIGGER_WAITS_FOR_RUN',
		'temporary',
		'engineV2Compatibility.reason.unsupportedNode',
		'engineV2Compatibility.fix.removeNode',
	],
	[
		'CONTINUE_ERROR_OUTPUT',
		'temporary',
		'engineV2Compatibility.reason.continueErrorOutput',
		'engineV2Compatibility.fix.continueErrorOutput',
	],
	[
		'MERGE_CHOOSE_BRANCH',
		'temporary',
		'engineV2Compatibility.reason.mergeChooseBranch',
		'engineV2Compatibility.fix.mergeChooseBranch',
	],
	[
		'MERGE_MODE_EXPRESSION',
		'permanent',
		'engineV2Compatibility.reason.mergeModeExpression',
		'engineV2Compatibility.fix.mergeModeExpression',
	],
	[
		'SPLIT_IN_BATCHES_OPTIONS_EXPRESSION',
		'permanent',
		'engineV2Compatibility.reason.splitInBatchesOptionsExpression',
		'engineV2Compatibility.fix.splitInBatchesOptionsExpression',
	],
	[
		'SPLIT_IN_BATCHES_RESET',
		'temporary',
		'engineV2Compatibility.reason.splitInBatchesReset',
		'engineV2Compatibility.fix.splitInBatchesReset',
	],
	[
		'SPLIT_IN_BATCHES_BATCH_SIZE',
		'permanent',
		'engineV2Compatibility.reason.splitInBatchesBatchSize.expression',
		'engineV2Compatibility.fix.splitInBatchesBatchSize.expression',
	],
	[
		'SPLIT_IN_BATCHES_BATCH_SIZE',
		'invalid',
		'engineV2Compatibility.reason.splitInBatchesBatchSize.invalid',
		'engineV2Compatibility.fix.splitInBatchesBatchSize.invalid',
	],
	[
		'SUB_WORKFLOW_FOR_EACH_ITEM',
		'permanent',
		'engineV2Compatibility.reason.subWorkflowForEachItem',
		'engineV2Compatibility.fix.subWorkflowForEachItem',
	],
	[
		'SUB_WORKFLOW_NOT_IN_DATABASE',
		'permanent',
		'engineV2Compatibility.reason.subWorkflowNotInDatabase',
		'engineV2Compatibility.fix.subWorkflowNotInDatabase',
	],
	[
		'CYCLE_WITHOUT_SPLIT_IN_BATCHES',
		'temporary',
		'engineV2Compatibility.reason.cycleWithoutSplitInBatches',
		'engineV2Compatibility.fix.cycleWithoutSplitInBatches',
	],
	[
		'LOOP_ENTERED_MID_BODY',
		'permanent',
		'engineV2Compatibility.reason.loopEnteredMidBody',
		'engineV2Compatibility.fix.loopEnteredMidBody',
	],
	[
		'LOOP_WITHOUT_RETURN',
		'permanent',
		'engineV2Compatibility.reason.loopWithoutReturn',
		'engineV2Compatibility.fix.loopWithoutReturn',
	],
	[
		'LOOP_INPUT_NOT_FIRST',
		'permanent',
		'engineV2Compatibility.reason.loopInputNotFirst',
		'engineV2Compatibility.fix.loopInputNotFirst',
	],
	[
		'LOOP_DONE_OUTPUT_FEEDS_BODY',
		'permanent',
		'engineV2Compatibility.reason.loopDoneOutputFeedsBody',
		'engineV2Compatibility.fix.loopDoneOutputFeedsBody',
	],
	[
		'LOOP_OUTPUT_NOT_DONE_OR_LOOP',
		'invalid',
		'engineV2Compatibility.reason.loopOutputNotDoneOrLoop',
		'engineV2Compatibility.fix.loopOutputNotDoneOrLoop',
	],
	[
		'NODE_REACHED_ONLY_THROUGH_DISABLED_NODE',
		'invalid',
		'engineV2Compatibility.reason.nodeReachedOnlyThroughDisabledNode',
		'engineV2Compatibility.fix.nodeReachedOnlyThroughDisabledNode',
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

	it.each(OWN_TEXT)(
		'shows what is not supported and how to fix it for %s (%s)',
		async (code, kind, reasonKey, fixKey) => {
			const { getAllByTestId } = await renderDialog([reason(code, kind)]);

			const text = i18n.baseText(reasonKey);
			const fix = i18n.baseText(fixKey);
			expect(text).not.toBe(reasonKey);
			expect(fix).not.toBe(fixKey);
			expect(reasonTexts(getAllByTestId)).toEqual([`${text}\n${fix}`]);
		},
	);

	// One pair of keys for these codes. Each finding names its setting as the node settings do.
	it.each<[Code, string]>([
		['RETRY_ON_FAIL', 'Retry On Fail'],
		['ALWAYS_OUTPUT_DATA', 'Always Output Data'],
		['EXECUTE_ONCE', 'Execute Once'],
	])('names the node setting of %s in what is not supported and in the fix', async (code, name) => {
		const { getAllByTestId } = await renderDialog([reason(code, 'temporary')]);

		expect(reasonTexts(getAllByTestId)).toEqual([
			`${name} isn't supported yet.\nTurn off ${name} in the node settings.`,
		]);
	});

	it('never repeats "Engine v2" in a finding', async () => {
		const { getAllByTestId } = await renderDialog(
			OWN_TEXT.map(([code, kind]) => reason(code, kind)),
		);

		for (const text of reasonTexts(getAllByTestId)) {
			expect(text.split('\n')[0]).not.toMatch(/Engine v2/);
		}
	});

	it('tells the two meanings of SPLIT_IN_BATCHES_BATCH_SIZE apart', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'permanent'),
			reason('SPLIT_IN_BATCHES_BATCH_SIZE', 'invalid'),
		]);

		const [expression, invalid] = reasonTexts(getAllByTestId);
		expect(expression).not.toBe(invalid);
	});

	it.each(PACKAGE_MESSAGE)('shows the package message for %s, with no fix line', async (code) => {
		const message = 'Details only the package knows. Run this workflow on engine v1 for now.';
		const { getAllByTestId, queryByTestId } = await renderDialog([
			reason(code, 'temporary', { message }),
		]);

		expect(reasonTexts(getAllByTestId)).toEqual([message]);
		expect(queryByTestId('engine-v2-compatibility-fix')).not.toBeInTheDocument();
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

	it('shows a node with two findings once, with both findings', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('RETRY_ON_FAIL', 'temporary', { nodeId: 'node-1', nodeName: 'HTTP Request' }),
			reason('EXECUTE_ONCE', 'temporary', { nodeId: 'node-1', nodeName: 'HTTP Request' }),
		]);

		expect(getAllByTestId('engine-v2-compatibility-group')).toHaveLength(1);
		expect(groupTitles(getAllByTestId)).toEqual(['HTTP Request']);
		expect(getAllByTestId('engine-v2-compatibility-reason')).toHaveLength(2);
	});

	it('names a finding with no node "Workflow settings", with no "Go to node"', async () => {
		const { getAllByTestId, queryByTestId } = await renderDialog([
			reason('ERROR_WORKFLOW', 'temporary'),
		]);

		expect(groupTitles(getAllByTestId)).toEqual([
			i18n.baseText('engineV2Compatibility.dialog.workflowSettings'),
		]);
		expect(queryByTestId('engine-v2-compatibility-go-to-node')).not.toBeInTheDocument();
	});

	it('emits open-node with the node id from "Go to node"', async () => {
		const { getByTestId, emitted } = await renderDialog([
			reason('RETRY_ON_FAIL', 'temporary', { nodeId: 'node-1', nodeName: 'HTTP Request' }),
		]);

		const goToNode = getByTestId('engine-v2-compatibility-go-to-node');
		expect(goToNode).toHaveTextContent(i18n.baseText('engineV2Compatibility.dialog.goToNode'));
		await fireEvent.click(goToNode);

		expect(emitted('open-node')).toEqual([['node-1']]);
	});

	it('emits switch-to-v1 from the footer button', async () => {
		const { getByTestId, emitted } = await renderDialog([reason('ERROR_WORKFLOW', 'temporary')]);

		const button = getByTestId('engine-v2-compatibility-switch-to-v1');
		expect(button).toHaveTextContent(i18n.baseText('engineV2Compatibility.dialog.switchToV1'));
		await fireEvent.click(button);

		expect(emitted('switch-to-v1')).toHaveLength(1);
	});

	it('closes from "Got it", which has focus when the dialog opens', async () => {
		const { getByTestId, emitted } = await renderDialog([reason('ERROR_WORKFLOW', 'temporary')]);

		const gotIt = getByTestId('engine-v2-compatibility-got-it');
		expect(gotIt).toHaveTextContent('Got it');
		await waitFor(() => expect(gotIt).toHaveFocus());

		await fireEvent.click(gotIt);

		expect(emitted('update:open')).toEqual([[false]]);
		expect(emitted('switch-to-v1')).toBeUndefined();
	});

	it('keeps "Got it" on when the user cannot edit the workflow', async () => {
		const { getByTestId } = await renderDialog([reason('ERROR_WORKFLOW', 'temporary')], {
			canSwitchToV1: false,
		});

		expect(getByTestId('engine-v2-compatibility-got-it')).toBeEnabled();
	});

	it('turns off the switch to engine v1 when the user cannot edit the workflow', async () => {
		const { getByTestId } = await renderDialog([reason('ERROR_WORKFLOW', 'temporary')], {
			canSwitchToV1: false,
		});

		expect(getByTestId('engine-v2-compatibility-switch-to-v1')).toBeDisabled();
	});

	it('uses one title for blocking issues and for warnings', async () => {
		const blocking = await renderDialog([reason('ERROR_WORKFLOW', 'temporary')]);
		expect(blocking.getByTestId('engine-v2-compatibility-dialog')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.title'),
		);
		blocking.unmount();

		const warnings = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);
		expect(warnings.getByTestId('engine-v2-compatibility-dialog')).toHaveTextContent(
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
		// The intro names the action, not the button.
		expect(getByTestId('engine-v2-compatibility-intro')).not.toHaveTextContent('Execute workflow');
	});

	it('explains the list of warnings when no reason blocks', async () => {
		const { getByTestId } = await renderDialog([
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		expect(getByTestId('engine-v2-compatibility-intro')).toHaveTextContent(
			i18n.baseText('engineV2Compatibility.dialog.introWarnings'),
		);
		// The intro names the action, not the button.
		expect(getByTestId('engine-v2-compatibility-intro')).not.toHaveTextContent('Execute workflow');
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

	it('gives each finding the icon of its severity', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('ERROR_WORKFLOW', 'temporary'),
			reason('REDACTION_POLICY', 'temporary', { severity: 'warning' }),
		]);

		const icons = getAllByTestId('engine-v2-compatibility-reason').map((item) =>
			item.querySelector('[data-icon]')?.getAttribute('data-icon'),
		);
		expect(icons).toEqual(['circle-x', 'triangle-alert']);
	});

	it('lists blocking groups first, each part in the order of the check', async () => {
		const { getAllByTestId } = await renderDialog([
			reason('FORM_NODE', 'temporary', { severity: 'warning', nodeName: 'A' }),
			reason('FORM_NODE', 'temporary', { nodeName: 'B' }),
			reason('FORM_NODE', 'temporary', { severity: 'warning', nodeName: 'C' }),
			reason('FORM_NODE', 'temporary', { nodeName: 'D' }),
		]);

		expect(groupTitles(getAllByTestId)).toEqual(['B', 'D', 'A', 'C']);
	});

	it('puts a long list in the scrolling body of the dialog', async () => {
		const reasons = Array.from({ length: 60 }, (_, index) =>
			reason('FORM_NODE', 'temporary', { nodeName: `Form ${index}` }),
		);
		const { getAllByTestId, baseElement } = await renderDialog(reasons);

		const body = baseElement.querySelector('[data-slot="dialog-body"]');
		const items = getAllByTestId('engine-v2-compatibility-group');
		expect(items).toHaveLength(60);
		expect(items.every((item) => body?.contains(item))).toBe(true);
	});
});
