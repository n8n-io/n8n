import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useResourceCenterStore } from '../resourceCenter.store';

// Mock dependencies
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant: vi.fn() }),
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
});
