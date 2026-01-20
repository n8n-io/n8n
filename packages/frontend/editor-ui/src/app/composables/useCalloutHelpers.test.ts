import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { createTestingPinia } from '@pinia/testing';
import { SampleTemplates } from '@/features/workflows/templates/utils/workflowSamples';
import { VIEWS } from '@/app/constants';

const mocks = vi.hoisted(() => ({
	resolve: vi.fn(),
	track: vi.fn(),
	useRoute: vi.fn(() => ({ query: {}, params: {} })),
	isCalloutDismissed: vi.fn(() => false),
	setCalloutDismissed: vi.fn(),
	restApiContext: vi.fn(() => ({})),
	getWorkflowById: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: mocks.resolve,
	}),
	useRoute: mocks.useRoute,
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		isCalloutDismissed: mocks.isCalloutDismissed,
		setCalloutDismissed: mocks.setCalloutDismissed,
		currentUser: { settings: { dismissedCallouts: {} } },
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowObject: {
			id: '1',
		},
		getWorkflowById: mocks.getWorkflowById,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: mocks.restApiContext,
	}),
}));

vi.mock('@n8n/rest-api-client/api/users', () => ({
	updateCurrentUserSettings: vi.fn(),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProjectId: 'test-project-id',
	}),
}));

describe('useCalloutHelpers()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
	});

	describe('openSampleWorkflowTemplate()', () => {
		it('opens the RAG starter template from NDV successfully', () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io' });

			const { openSampleWorkflowTemplate } = useCalloutHelpers();
			const nodeType = 'testNode';

			openSampleWorkflowTemplate(SampleTemplates.RagStarterTemplate, {
				telemetry: {
					source: 'ndv',
					nodeType,
				},
			});

			expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
			expect(mocks.track).toHaveBeenCalledWith('User clicked on RAG callout', {
				node_type: nodeType,
			});
		});

		it('opens the RAG starter template from node creator successfully', () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io' });

			const { openSampleWorkflowTemplate } = useCalloutHelpers();

			openSampleWorkflowTemplate(SampleTemplates.RagStarterTemplate, {
				telemetry: {
					source: 'nodeCreator',
					section: 'testSection',
				},
			});

			expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
			expect(mocks.track).toHaveBeenCalledWith('User clicked on RAG callout', {
				node_type: null,
			});
		});

		it('opens easy AI starter successfully', () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io' });

			const { openSampleWorkflowTemplate } = useCalloutHelpers();

			openSampleWorkflowTemplate('self-building-ai-agent', {
				telemetry: {
					source: 'ndv',
					nodeType: 'testNode',
				},
			});

			expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
			expect(mocks.track).not.toHaveBeenCalled();
		});

		it('includes project ID in template URL when opening template', () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io/template/test' });

			const { openSampleWorkflowTemplate } = useCalloutHelpers();

			openSampleWorkflowTemplate(SampleTemplates.RagStarterTemplate, {
				telemetry: {
					source: 'ndv',
					nodeType: 'testNode',
				},
			});

			expect(mocks.resolve).toHaveBeenCalledWith({
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: SampleTemplates.RagStarterTemplate },
				query: {
					fromJson: 'true',
					projectId: 'test-project-id',
				},
			});
		});

		it('includes folder ID in template URL when opening template', () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io/template/test' });
			mocks.useRoute.mockReturnValueOnce({
				query: {},
				params: { folderId: 'my-folder-id' },
			});

			const { openSampleWorkflowTemplate } = useCalloutHelpers();

			openSampleWorkflowTemplate(SampleTemplates.EasyAiTemplate, {
				telemetry: {
					source: 'ndv',
					nodeType: 'testNode',
				},
			});

			expect(mocks.resolve).toHaveBeenCalledWith({
				name: VIEWS.TEMPLATE_IMPORT,
				params: { id: SampleTemplates.EasyAiTemplate },
				query: {
					fromJson: 'true',
					projectId: 'test-project-id',
					parentFolderId: 'my-folder-id',
				},
			});
		});
	});

	describe('isRagStarterCalloutVisible', () => {
		it('should be true if current route is not on the RAG starter template', () => {
			const { isRagStarterCalloutVisible } = useCalloutHelpers();
			expect(isRagStarterCalloutVisible.value).toBe(true);
		});

		it('should be false and current route is not on unsaved RAG starter template', () => {
			mocks.useRoute.mockReturnValueOnce({
				query: { templateId: SampleTemplates.RagStarterTemplate },
				params: {},
			});

			const { isRagStarterCalloutVisible } = useCalloutHelpers();
			expect(isRagStarterCalloutVisible.value).toBe(false);
		});

		it('should be false if current route is on saved RAG starter template', () => {
			mocks.getWorkflowById.mockReturnValueOnce({
				meta: { templateId: SampleTemplates.RagStarterTemplate },
			});

			const { isRagStarterCalloutVisible } = useCalloutHelpers();
			expect(isRagStarterCalloutVisible.value).toBe(false);
		});
	});

	describe('isCalloutDismissed()', () => {
		it('should return false if callout is not dismissed', () => {
			const { isCalloutDismissed } = useCalloutHelpers();
			const result = isCalloutDismissed('testNode');
			expect(result).toBe(false);
		});

		it('should return true if callout is dismissed', () => {
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
