import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import type { INodeTypeDescription } from 'n8n-workflow';
import { updateCurrentUserSettings } from '@/api/users';

const mocks = vi.hoisted(() => ({
	resolve: vi.fn(),
	track: vi.fn(),
	getVariant: vi.fn(() => 'default'),
	isCalloutDismissed: vi.fn(() => false),
	setCalloutDismissed: vi.fn(),
	restApiContext: vi.fn(() => ({})),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: mocks.resolve,
	}),
	useRoute: () => ({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mocks.getVariant,
	}),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: () => ({
		isCalloutDismissed: mocks.isCalloutDismissed,
		setCalloutDismissed: mocks.setCalloutDismissed,
		currentUser: { settings: { dismissedCallouts: {} } },
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: mocks.restApiContext,
	}),
}));

vi.mock('@/api/users', () => ({
	updateCurrentUserSettings: vi.fn(),
}));

describe('useCalloutHelpers()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('openRagStarterTemplate()', () => {
		it('opens the RAG starter template successfully', async () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io' });

			const { openRagStarterTemplate } = useCalloutHelpers();
			const nodeType = { name: 'testNode' } as INodeTypeDescription;

			await openRagStarterTemplate(nodeType);

			expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
			expect(mocks.track).toHaveBeenCalledWith('User clicked on RAG callout', {
				node_type: nodeType.name,
			});
		});
	});

	describe('isRagStarterWorkflowExperimentEnabled', () => {
		it('should return false if the RAG starter workflow experiment is not enabled', () => {
			const { isRagStarterWorkflowExperimentEnabled } = useCalloutHelpers();
			expect(isRagStarterWorkflowExperimentEnabled.value).toBe(false);
		});

		it('should return true if the RAG starter workflow experiment is enabled', () => {
			mocks.getVariant.mockReturnValueOnce('variant');

			const { isRagStarterWorkflowExperimentEnabled } = useCalloutHelpers();
			expect(isRagStarterWorkflowExperimentEnabled.value).toBe(true);
		});
	});

	describe('isCalloutDismissed()', () => {
		it('should return false if callout is not dismissed', async () => {
			const { isCalloutDismissed } = useCalloutHelpers();
			const result = isCalloutDismissed('testNode');
			expect(result).toBe(false);
		});

		it('should return true if callout is dismissed', async () => {
			mocks.isCalloutDismissed.mockReturnValueOnce(true);

			const { isCalloutDismissed } = useCalloutHelpers();
			const result = isCalloutDismissed('testNode');
			expect(result).toBe(true);
		});
	});

	describe('dismissCallout()', () => {
		it('should dismiss the callout and update user settings', async () => {
			const { dismissCallout } = useCalloutHelpers();

			await dismissCallout('testCallout');
			expect(mocks.setCalloutDismissed).toHaveBeenCalledWith('testCallout');

			expect(updateCurrentUserSettings).toHaveBeenCalledWith(mocks.restApiContext, {
				dismissedCallouts: {
					testCallout: true,
				},
			});
		});
	});
});
