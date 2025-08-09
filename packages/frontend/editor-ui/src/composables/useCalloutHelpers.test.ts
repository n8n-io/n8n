import { useCalloutHelpers } from '@/composables/useCalloutHelpers';
import { updateCurrentUserSettings } from '@n8n/rest-api-client/api/users';
import { createTestingPinia } from '@pinia/testing';
import { PrebuiltAgentTemplates, SampleTemplates } from '@/utils/templates/workflowSamples';
import { useNDVStore } from '@/stores/ndv.store';
import { mockedStore } from '@/__tests__/utils';
import { NODE_CREATOR_OPEN_SOURCES } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';

const mocks = vi.hoisted(() => ({
	resolve: vi.fn(),
	track: vi.fn(),
	useRoute: vi.fn(() => ({ query: {}, params: {} })),
	isVariantEnabled: vi.fn(() => false),
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

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mocks.track }),
}));

vi.mock('@/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: mocks.isVariantEnabled,
	}),
}));

vi.mock('@/stores/users.store', () => ({
	useUsersStore: () => ({
		isCalloutDismissed: mocks.isCalloutDismissed,
		setCalloutDismissed: mocks.setCalloutDismissed,
		currentUser: { settings: { dismissedCallouts: {} } },
	}),
}));

vi.mock('@/stores/workflows.store', () => ({
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

let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
let nodeCreatorStore: ReturnType<typeof mockedStore<typeof useNodeCreatorStore>>;
let viewStacks: ReturnType<typeof mockedStore<typeof useViewStacks>>;

describe('useCalloutHelpers()', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		ndvStore = mockedStore(useNDVStore);
		nodeCreatorStore = mockedStore(useNodeCreatorStore);
		viewStacks = mockedStore(useViewStacks);
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

		it.each(Object.values(PrebuiltAgentTemplates))(
			'opens pre-built agent template %s from NDV successfully',
			(templateId) => {
				vi.spyOn(window, 'open').mockImplementation(() => null);
				mocks.resolve.mockReturnValue({ href: 'n8n.io' });

				const { openSampleWorkflowTemplate } = useCalloutHelpers();
				const nodeType = 'testNode';

				openSampleWorkflowTemplate(templateId, {
					telemetry: {
						source: 'ndv',
						nodeType,
					},
				});

				expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
				expect(mocks.track).toHaveBeenCalledWith('User inserted pre-built Agent', {
					source: 'ndv',
					template: templateId,
					node_type: nodeType,
					section: null,
				});
			},
		);

		it.each(Object.values(PrebuiltAgentTemplates))(
			'opens pre-built agent template %s from node creator successfully',
			(templateId) => {
				vi.spyOn(window, 'open').mockImplementation(() => null);
				mocks.resolve.mockReturnValue({ href: 'n8n.io' });

				const { openSampleWorkflowTemplate } = useCalloutHelpers();
				const section = 'Test Section';

				openSampleWorkflowTemplate(templateId, {
					telemetry: {
						source: 'nodeCreator',
						section,
					},
				});

				expect(window.open).toHaveBeenCalledWith('n8n.io', '_blank');
				expect(mocks.track).toHaveBeenCalledWith('User inserted pre-built Agent', {
					source: 'nodeCreator',
					template: templateId,
					node_type: null,
					section,
				});
			},
		);
	});

	describe('openPreBuiltAgentsCollection', () => {
		it('opens pre-built agents collection successfully', async () => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
			mocks.resolve.mockReturnValue({ href: 'n8n.io' });

			const { openPreBuiltAgentsCollection } = useCalloutHelpers();

			await openPreBuiltAgentsCollection({
				telemetry: {
					source: 'ndv',
					nodeType: 'testNode',
					section: 'testSection',
				},
			});

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
			expect(nodeCreatorStore.setNodeCreatorState).toHaveBeenCalledWith({
				source: NODE_CREATOR_OPEN_SOURCES.TEMPLATES_CALLOUT,
				createNodeActive: true,
			});
			expect(viewStacks.pushViewStack).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Pre-built agents' }),
				{ resetStacks: false },
			);
			expect(mocks.track).toHaveBeenCalledWith('User opened pre-built Agents collection', {
				source: 'ndv',
				node_type: 'testNode',
				section: 'testSection',
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

	describe('isPreBuiltAgentsCalloutVisible', () => {
		it('should be false with experiment disabled', () => {
			mocks.isVariantEnabled.mockReturnValueOnce(false);

			const { isPreBuiltAgentsCalloutVisible } = useCalloutHelpers();
			expect(isPreBuiltAgentsCalloutVisible.value).toBe(false);
		});

		it('should be true with experiment enabled', () => {
			mocks.isVariantEnabled.mockReturnValueOnce(true);

			const { isPreBuiltAgentsCalloutVisible } = useCalloutHelpers();
			expect(isPreBuiltAgentsCalloutVisible.value).toBe(true);
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
