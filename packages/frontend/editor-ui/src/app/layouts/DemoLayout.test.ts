import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import DemoLayout from './DemoLayout.vue';
import { computed, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';

const demoLayoutMocks = vi.hoisted(() => ({
	initializeData: vi.fn(),
	initializeWorkflow: vi.fn(),
	cleanupInitialization: vi.fn(),
	setupPostMessages: vi.fn(),
	cleanupPostMessages: vi.fn(),
	currentWorkflowDocumentStore: { value: {} as object | null, __v_isRef: true as const },
	currentNDVStore: { value: {} as object | null, __v_isRef: true as const },
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: () => ({
			params: {},
			query: {},
			meta: {},
			name: 'demo',
		}),
		useRouter: () => ({
			replace: vi.fn(),
			push: vi.fn(),
		}),
	};
});

vi.mock('@/app/composables/useWorkflowState', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useWorkflowState: vi.fn(() => ({
			getNewWorkflowDataAndMakeShareable: vi.fn(),
			setActiveExecutionId: vi.fn(),
			resetState: vi.fn(),
		})),
	};
});

vi.mock('@/app/composables/useWorkflowInitialization', () => ({
	useWorkflowInitialization: vi.fn(() => ({
		isLoading: ref(false),
		workflowId: computed(() => 'demo'),
		currentWorkflowDocumentStore: demoLayoutMocks.currentWorkflowDocumentStore,
		currentNDVStore: demoLayoutMocks.currentNDVStore,
		initializeData: demoLayoutMocks.initializeData,
		initializeWorkflow: demoLayoutMocks.initializeWorkflow,
		cleanup: demoLayoutMocks.cleanupInitialization,
	})),
}));

vi.mock('@/app/composables/usePostMessageHandler', () => ({
	usePostMessageHandler: vi.fn(() => ({
		setup: demoLayoutMocks.setupPostMessages,
		cleanup: demoLayoutMocks.cleanupPostMessages,
	})),
}));

const mockPushInitialize = vi.fn();
const mockPushTerminate = vi.fn();
vi.mock('@/app/composables/usePushConnection/usePushConnection', () => ({
	usePushConnection: vi.fn(() => ({
		initialize: mockPushInitialize,
		terminate: mockPushTerminate,
	})),
}));

const renderComponent = createComponentRenderer(DemoLayout, {
	global: {
		stubs: {
			DemoFooter: {
				template: '<div data-test-id="demo-footer">Demo Footer</div>',
			},
			RouterView: {
				template: '<div><slot /></div>',
			},
			Suspense: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('DemoLayout', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
		demoLayoutMocks.initializeData.mockResolvedValue(undefined);
		demoLayoutMocks.initializeWorkflow.mockResolvedValue(undefined);
		demoLayoutMocks.currentWorkflowDocumentStore.value = {};
		demoLayoutMocks.currentNDVStore.value = {};
	});

	it('should render the layout without throwing', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	it('should render the main content area', () => {
		const { container } = renderComponent();
		const mainElement = container.querySelector('main#content');
		expect(mainElement).toBeInTheDocument();
	});

	it('should render app grid container from BaseLayout', () => {
		const { container } = renderComponent();
		const gridElement = container.querySelector('.app-grid');
		expect(gridElement).toBeInTheDocument();
	});

	it('should render RouterView content', () => {
		const { getByText } = renderComponent({
			global: {
				stubs: {
					RouterView: {
						template: '<div>Demo Layout Content</div>',
					},
				},
			},
		});
		expect(getByText('Demo Layout Content')).toBeInTheDocument();
	});

	it('should not render RouterView content until both scoped stores exist', () => {
		demoLayoutMocks.currentWorkflowDocumentStore.value = null;

		const { queryByText } = renderComponent({
			global: {
				stubs: {
					RouterView: {
						template: '<div>Demo Layout Content</div>',
					},
				},
			},
		});

		expect(queryByText('Demo Layout Content')).not.toBeInTheDocument();
	});

	it('should render DemoFooter component in footer slot', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});

	it('should wrap DemoFooter in Suspense', () => {
		const { getByTestId } = renderComponent();
		const demoFooter = getByTestId('demo-footer');
		expect(demoFooter).toBeInTheDocument();
		expect(demoFooter.textContent).toBe('Demo Footer');
	});

	it('should not render header', () => {
		const { container } = renderComponent();
		const headerElement = container.querySelector('header#header');
		expect(headerElement).not.toBeInTheDocument();
	});

	it('should not render sidebar', () => {
		const { container } = renderComponent();
		const sidebarElement = container.querySelector('aside#sidebar');
		expect(sidebarElement).not.toBeInTheDocument();
	});

	it('should render content and footer together', () => {
		const { getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					DemoFooter: {
						template: '<div data-test-id="demo-footer">Demo Footer</div>',
					},
					RouterView: {
						template: '<div>Main Content Area</div>',
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('Main Content Area')).toBeInTheDocument();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});

	it('should render multiple content items via RouterView', () => {
		const { getByText, getByTestId } = renderComponent({
			global: {
				stubs: {
					DemoFooter: {
						template: '<div data-test-id="demo-footer">Demo Footer</div>',
					},
					RouterView: {
						template: `
							<div>
								<div>First Content</div>
								<div>Second Content</div>
								<div>Third Content</div>
							</div>
						`,
					},
					Suspense: {
						template: '<div><slot /></div>',
					},
				},
			},
		});
		expect(getByText('First Content')).toBeInTheDocument();
		expect(getByText('Second Content')).toBeInTheDocument();
		expect(getByText('Third Content')).toBeInTheDocument();
		expect(getByTestId('demo-footer')).toBeInTheDocument();
	});

	describe('push connection', () => {
		it('should set up post messages only after workflow initialization completes', async () => {
			let resolveInitializeWorkflow: () => void;
			demoLayoutMocks.initializeWorkflow.mockReturnValueOnce(
				new Promise<void>((resolve) => {
					resolveInitializeWorkflow = resolve;
				}),
			);

			renderComponent();

			await vi.waitFor(() => {
				expect(demoLayoutMocks.initializeWorkflow).toHaveBeenCalled();
			});
			expect(mockPushInitialize).not.toHaveBeenCalled();
			expect(demoLayoutMocks.setupPostMessages).not.toHaveBeenCalled();

			resolveInitializeWorkflow!();

			await vi.waitFor(() => {
				expect(demoLayoutMocks.setupPostMessages).toHaveBeenCalled();
			});
			expect(mockPushInitialize).toHaveBeenCalled();
			expect(mockPushInitialize.mock.invocationCallOrder[0]).toBeLessThan(
				demoLayoutMocks.setupPostMessages.mock.invocationCallOrder[0],
			);
		});

		it('should initialize push handlers on mount', async () => {
			renderComponent();
			await vi.waitFor(() => {
				expect(mockPushInitialize).toHaveBeenCalled();
			});
		});

		it('should terminate push handlers on unmount', () => {
			const { unmount } = renderComponent();
			unmount();
			expect(mockPushTerminate).toHaveBeenCalled();
		});
	});
});
