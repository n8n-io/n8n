import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useResourceCenterStore } from '../resourceCenter.store';

const mocks = vi.hoisted(() => ({
	track: vi.fn(),
	getVariant: vi.fn(),
	isVariantEnabled: vi.fn(),
}));

const storage = vi.hoisted(() => {
	const values = new Map<string, string>();

	return {
		getItem: vi.fn((key: string) => values.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			values.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			values.delete(key);
		}),
		reset: () => {
			values.clear();
		},
	};
});

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mocks.getVariant,
		isVariantEnabled: mocks.isVariantEnabled,
	}),
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

const resetResourceCenterStorage = () => {
	storage.reset();
	storage.getItem.mockClear();
	storage.setItem.mockClear();
	storage.removeItem.mockClear();
};

describe('resourceCenter.store', () => {
	beforeEach(() => {
		Object.defineProperty(window, 'localStorage', {
			value: storage,
			configurable: true,
		});
		setActivePinia(createPinia());
		resetResourceCenterStorage();
		mocks.track.mockClear();
		mocks.getVariant.mockReset();
		mocks.isVariantEnabled.mockReset();
		mocks.isVariantEnabled.mockImplementation(
			(experiment: string, variant: string) => mocks.getVariant(experiment) === variant,
		);
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

	describe('sidebar auto-expand', () => {
		it('stops auto-expanding after the sidebar is marked as expanded', () => {
			mocks.getVariant.mockReturnValue('variant');
			const store = useResourceCenterStore();

			expect(store.shouldAutoExpandSidebar).toBe(true);

			store.markSidebarAutoExpanded();

			expect(store.shouldAutoExpandSidebar).toBe(false);
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
