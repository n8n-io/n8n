import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useResourceCenterStore } from '../resourceCenter.store';

const mocks = vi.hoisted(() => ({
	track: vi.fn(),
	getVariant: vi.fn(),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant: mocks.getVariant }),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({ createNewWorkflow: vi.fn() }),
}));

vi.mock('@/features/workflows/templates/templates.store', () => ({
	useTemplatesStore: () => ({ fetchTemplateById: vi.fn() }),
}));

vi.mock('@/features/workflows/readyToRun/stores/readyToRun.store', () => ({
	useReadyToRunStore: () => ({ userCanClaimOpenAiCredits: false, claimFreeAiCredits: vi.fn() }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

describe('resourceCenter.store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		localStorage.clear();
		mocks.track.mockClear();
		mocks.getVariant.mockReset();
	});

	describe('tooltip persistence (GRO-284 fix)', () => {
		it('reads dismissed state from localStorage on init', () => {
			localStorage.setItem('n8n-resourceCenter-tooltipDismissed', 'true');
			setActivePinia(createPinia());
			const store = useResourceCenterStore();
			// shouldShowResourceCenterTooltip should be false since tooltip was dismissed
			expect(store.shouldShowResourceCenterTooltip).toBe(false);
		});
	});

	describe('experiment participation tracking', () => {
		it('does not emit "User is part of experiment" from the store', () => {
			// The participation event is emitted once via EXPERIMENTS_TO_TRACK in posthog.store.
			// The store must not fire a second copy of it, even when enrolled.
			mocks.getVariant.mockReturnValue('variant');

			useResourceCenterStore();

			expect(mocks.track).not.toHaveBeenCalledWith('User is part of experiment', expect.anything());
		});
	});
});
