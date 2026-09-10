import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INode } from 'n8n-workflow';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { mockedStore } from '@/__tests__/utils';
import { GATEWAY_OPPORTUNITY_SWITCH_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useGatewayOpportunityNudgeStore } from '../stores/gatewayOpportunityNudge.store';
import { maybeShowGatewayOpportunityNudge } from './useGatewayOpportunityNudge';

const scanNodes = vi.fn();
vi.mock('./useWorkflowGatewayScan', () => ({
	useWorkflowGatewayScan: () => ({ scanNodes }),
}));

const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage }),
}));

const fetchConfig = vi.fn();
vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({ fetchConfig }),
}));

const canApply = { value: true };
vi.mock('./useApplyGatewayCredential', () => ({
	useApplyGatewayCredential: () => ({ canApply }),
}));

describe('maybeShowGatewayOpportunityNudge', () => {
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let nudgeStore: ReturnType<typeof mockedStore<typeof useGatewayOpportunityNudgeStore>>;
	let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;

	const nodes: INode[] = [];
	const opportunities = [{ nodeName: 'n1' }, { nodeName: 'n2' }];

	beforeEach(() => {
		vi.clearAllMocks();
		canApply.value = true;
		setActivePinia(createTestingPinia({ stubActions: false }));
		settingsStore = mockedStore(useSettingsStore);
		nudgeStore = mockedStore(useGatewayOpportunityNudgeStore);
		uiStore = mockedStore(useUIStore);

		settingsStore.isAiGatewayEnabled = true;
		scanNodes.mockReturnValue({ opportunities, blocked: [], alreadyManagedCount: 0 });
		nudgeStore.shouldShow.mockReturnValue(true);
		showMessage.mockReturnValue({ close: vi.fn() });
		fetchConfig.mockResolvedValue(undefined);
	});

	it('does nothing when Gateway credits is disabled', async () => {
		settingsStore.isAiGatewayEnabled = false;
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');
		expect(scanNodes).not.toHaveBeenCalled();
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('loads the gateway config before scanning, so a fresh session still finds nodes', async () => {
		const callOrder: string[] = [];
		fetchConfig.mockImplementation(async () => {
			callOrder.push('fetchConfig');
		});
		scanNodes.mockImplementation(() => {
			callOrder.push('scanNodes');
			return { opportunities: [{}], blocked: [], alreadyManagedCount: 0 };
		});

		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		expect(callOrder).toEqual(['fetchConfig', 'scanNodes']);
	});

	it('does not load the gateway config when Gateway credits is disabled', async () => {
		settingsStore.isAiGatewayEnabled = false;

		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		expect(fetchConfig).not.toHaveBeenCalled();
	});

	it('does nothing when the store says not to show', async () => {
		nudgeStore.shouldShow.mockReturnValue(false);
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');
		expect(showMessage).not.toHaveBeenCalled();
		expect(nudgeStore.markShown).not.toHaveBeenCalled();
	});

	it('shows a sticky toast and marks it shown with the opportunity count', async () => {
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Gateway credits available',
				type: 'info',
				duration: 0,
			}),
		);
		expect(nudgeStore.markShown).toHaveBeenCalledWith(2, 'wf1');
	});

	it('passes canApply through to the toast message', async () => {
		canApply.value = false;
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		const [[{ message }]] = showMessage.mock.calls;
		expect(message.props.canApply).toBe(false);
	});

	it('closes the toast and defers to the store when the message emits dismiss', async () => {
		const close = vi.fn();
		showMessage.mockReturnValue({ close });
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		const [[{ message }]] = showMessage.mock.calls;
		message.props.onDismiss();

		expect(close).toHaveBeenCalled();
		expect(nudgeStore.dismiss).toHaveBeenCalledWith('wf1');
	});

	it('closes the toast and defers to the store when the message emits neverShowAgain', async () => {
		const close = vi.fn();
		showMessage.mockReturnValue({ close });
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		const [[{ message }]] = showMessage.mock.calls;
		message.props.onNeverShowAgain();

		expect(close).toHaveBeenCalled();
		expect(nudgeStore.neverShowAgain).toHaveBeenCalledWith('wf1');
	});

	it('closes the toast, tracks the action, and opens the switch modal when the message emits reviewAndSwitch', async () => {
		const close = vi.fn();
		showMessage.mockReturnValue({ close });
		await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

		const [[{ message }]] = showMessage.mock.calls;
		message.props.onReviewAndSwitch();

		expect(close).toHaveBeenCalled();
		expect(nudgeStore.actionReviewAndSwitch).toHaveBeenCalledWith('wf1', 2);
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: GATEWAY_OPPORTUNITY_SWITCH_MODAL_KEY,
			data: { opportunities, workflowId: 'wf1' },
		});
	});

	describe('caveated opportunities', () => {
		it('counts only opportunities without a caveat for shouldShow, markShown and the toast, but still hands the modal the full list', async () => {
			const mixed = [
				{ nodeName: 'n1' },
				{ nodeName: 'n2', caveat: 'unsupportedModel' },
				{ nodeName: 'n3', caveat: 'unsupportedAction' },
			];
			scanNodes.mockReturnValue({ opportunities: mixed, blocked: [], alreadyManagedCount: 0 });

			await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

			expect(nudgeStore.shouldShow).toHaveBeenCalledWith(1, 'wf1');
			expect(nudgeStore.markShown).toHaveBeenCalledWith(1, 'wf1');
			const [[{ message }]] = showMessage.mock.calls;
			expect(message.props.opportunityCount).toBe(1);

			message.props.onReviewAndSwitch();
			expect(uiStore.openModalWithData).toHaveBeenCalledWith({
				name: GATEWAY_OPPORTUNITY_SWITCH_MODAL_KEY,
				data: { opportunities: mixed, workflowId: 'wf1' },
			});
		});

		it('shows no toast when every opportunity is caveated, since none is safe to switch as-is', async () => {
			const allCaveated = [
				{ nodeName: 'n1', caveat: 'unsupportedModel' },
				{ nodeName: 'n2', caveat: 'hiddenPropertySet' },
			];
			scanNodes.mockReturnValue({
				opportunities: allCaveated,
				blocked: [],
				alreadyManagedCount: 0,
			});
			// Mirror the store's real rule (no toast when the clean count is 0)
			// instead of the beforeEach's blanket true, so this test exercises it.
			nudgeStore.shouldShow.mockImplementation((count: number) => count > 0);

			await maybeShowGatewayOpportunityNudge(nodes, 'wf1');

			expect(nudgeStore.shouldShow).toHaveBeenCalledWith(0, 'wf1');
			expect(showMessage).not.toHaveBeenCalled();
			expect(nudgeStore.markShown).not.toHaveBeenCalled();
		});
	});
});
