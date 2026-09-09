import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import type { INode } from 'n8n-workflow';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { mockedStore } from '@/__tests__/utils';
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

describe('maybeShowGatewayOpportunityNudge', () => {
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let nudgeStore: ReturnType<typeof mockedStore<typeof useGatewayOpportunityNudgeStore>>;

	const nodes: INode[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		settingsStore = mockedStore(useSettingsStore);
		nudgeStore = mockedStore(useGatewayOpportunityNudgeStore);

		settingsStore.isAiGatewayEnabled = true;
		scanNodes.mockReturnValue({ opportunities: [{}, {}], blocked: [], alreadyManagedCount: 0 });
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
});
