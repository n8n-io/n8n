import { EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT } from '@/app/constants/experiments';
import { STORES } from '@n8n/stores';
import { createPinia, setActivePinia } from 'pinia';

const mockTrack = vi.fn();
const featureFlagProperty = `$feature/${EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.name}`;

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

const mockGetVariant = vi.fn();
const mockIsVariantEnabled = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
		isVariantEnabled: mockIsVariantEnabled,
	}),
}));

import { useExposeAllWorkflowsToMcpStore } from './exposeAllWorkflowsToMcp.store';

describe('exposeAllWorkflowsToMcp store', () => {
	let store: ReturnType<typeof useExposeAllWorkflowsToMcpStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockTrack.mockClear();
		mockGetVariant.mockReset();
		mockIsVariantEnabled.mockReset();

		store = useExposeAllWorkflowsToMcpStore();
	});

	it('derives enrollment from the PostHog variant', () => {
		mockIsVariantEnabled.mockReturnValue(true);
		mockGetVariant.mockReturnValue(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant);

		expect(store.$id).toBe(STORES.EXPERIMENT_EXPOSE_ALL_WORKFLOWS_TO_MCP);
		expect(store.currentVariant).toBe(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant);
		expect(store.isEnabled).toBe(true);
		expect(mockIsVariantEnabled).toHaveBeenCalledWith(
			EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.name,
			EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant,
		);
	});

	it('is not enabled for the control variant', () => {
		mockIsVariantEnabled.mockReturnValue(false);
		mockGetVariant.mockReturnValue(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.control);

		expect(store.isEnabled).toBe(false);
	});

	it.each([
		['trackConfirmed', 'MCP expose all workflows confirmed'],
		['trackDeclined', 'MCP expose all workflows declined'],
		['trackDismissed', 'MCP expose all workflows modal dismissed'],
	] as const)('%s tracks the event with the current variant', (method, event) => {
		mockGetVariant.mockReturnValue(EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant);

		store[method]();

		expect(mockTrack).toHaveBeenCalledWith(event, {
			variant: EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant,
			[featureFlagProperty]: EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT.variant,
		});
	});
});
