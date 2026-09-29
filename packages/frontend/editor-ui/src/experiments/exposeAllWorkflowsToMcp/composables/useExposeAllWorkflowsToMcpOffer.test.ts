import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY } from '@/experiments/exposeAllWorkflowsToMcp/constants';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';

import { useExposeAllWorkflowsToMcpOffer } from './useExposeAllWorkflowsToMcpOffer';

describe('useExposeAllWorkflowsToMcpOffer', () => {
	let mcpStore: MockedStore<typeof useMCPStore>;
	let uiStore: MockedStore<typeof useUIStore>;
	let experimentStore: MockedStore<typeof useExposeAllWorkflowsToMcpStore>;
	let settingsStore: MockedStore<typeof useSettingsStore>;

	beforeEach(() => {
		createTestingPinia();
		mcpStore = mockedStore(useMCPStore);
		uiStore = mockedStore(useUIStore);
		experimentStore = mockedStore(useExposeAllWorkflowsToMcpStore);
		settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive = vi.fn().mockReturnValue(false);
	});

	it('opens the expose-all modal when enrolled and eligible workflows exist', async () => {
		experimentStore.isEnabled = true;
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 5, data: [] });
		const onExposed = vi.fn();

		const opened = await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(onExposed);

		expect(opened).toBe(true);
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: EXPOSE_ALL_WORKFLOWS_TO_MCP_MODAL_KEY,
			data: { onExposed },
		});
	});

	it('does nothing when not enrolled in the experiment', async () => {
		experimentStore.isEnabled = false;

		const opened = await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(vi.fn());

		expect(opened).toBe(false);
		expect(mcpStore.getMcpEligibleWorkflows).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('does not open the modal when there are no eligible workflows', async () => {
		experimentStore.isEnabled = true;
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 0, data: [] });

		const opened = await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(vi.fn());

		expect(opened).toBe(false);
		expect(mcpStore.getMcpEligibleWorkflows).toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('opens the modal when only eligible agents exist and the agents module is active', async () => {
		experimentStore.isEnabled = true;
		settingsStore.isModuleActive = vi.fn().mockReturnValue(true);
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 0, data: [] });
		mcpStore.getMcpEligibleAgents.mockResolvedValue({ count: 2, data: [] });

		const opened = await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(vi.fn());

		expect(opened).toBe(true);
		expect(settingsStore.isModuleActive).toHaveBeenCalledWith('agents');
		expect(mcpStore.getMcpEligibleAgents).toHaveBeenCalledWith({ take: 1 });
		expect(uiStore.openModalWithData).toHaveBeenCalled();
	});

	it('does not check agents when the agents module is inactive', async () => {
		experimentStore.isEnabled = true;
		mcpStore.getMcpEligibleWorkflows.mockResolvedValue({ count: 0, data: [] });

		const opened = await useExposeAllWorkflowsToMcpOffer().offerToExposeAllWorkflows(vi.fn());

		expect(opened).toBe(false);
		expect(mcpStore.getMcpEligibleAgents).not.toHaveBeenCalled();
	});
});
