import { nextTick, ref } from 'vue';
import { useWorkflowDiffRouting } from '@/composables/useWorkflowDiffRouting';
import {
	WORKFLOW_DIFF_MODAL_KEY,
	SOURCE_CONTROL_PUSH_MODAL_KEY,
	SOURCE_CONTROL_PULL_MODAL_KEY,
} from '@/constants';

// Mock vue-router
const mockRoute = ref({
	query: {},
});

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute.value,
}));

// Mock UI Store
const mockUiStore = {
	modalsById: {} as Record<string, { open?: boolean; data?: unknown }>,
	closeModal: vi.fn(),
	openModalWithData: vi.fn(),
};

vi.mock('@/stores/ui.store', () => ({
	useUIStore: () => mockUiStore,
}));

// Mock event bus
const mockEventBus = {
	emit: vi.fn(),
	on: vi.fn(),
	off: vi.fn(),
};

vi.mock('@n8n/utils/event-bus', () => ({
	createEventBus: () => mockEventBus,
}));

describe('useWorkflowDiffRouting', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUiStore.modalsById = {};
		mockRoute.value = { query: {} };
	});

	describe('initialization', () => {
		it('should return workflowDiffEventBus', () => {
			const { workflowDiffEventBus } = useWorkflowDiffRouting();
			expect(workflowDiffEventBus).toBe(mockEventBus);
		});

		it('should call handleRouteChange immediately on initialization', () => {
			const spy = vi.spyOn(mockUiStore, 'closeModal');

			// Set up modals as open so they can be closed
			mockUiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY] = { open: true };
			mockUiStore.modalsById[SOURCE_CONTROL_PULL_MODAL_KEY] = { open: true };

			useWorkflowDiffRouting();

			// Should close both source control modals when no query params
			expect(spy).toHaveBeenCalledWith(SOURCE_CONTROL_PUSH_MODAL_KEY);
			expect(spy).toHaveBeenCalledWith(SOURCE_CONTROL_PULL_MODAL_KEY);
		});
	});

	describe('query parameter parsing', () => {
		it('should parse valid diff query parameter', async () => {
			mockRoute.value.query = {
				diff: 'workflow-123',
				direction: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: mockEventBus,
					workflowId: 'workflow-123',
					direction: 'push',
				},
			});
		});

		it('should ignore invalid diff query parameter types', async () => {
			mockRoute.value.query = {
				diff: ['array-value'],
				direction: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			// Should still open source control modal based on direction, not diff modal
			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});

			// Should not open diff modal
			expect(mockUiStore.openModalWithData).not.toHaveBeenCalledWith(
				expect.objectContaining({
					name: WORKFLOW_DIFF_MODAL_KEY,
				}),
			);
		});

		it('should parse valid direction query parameter', async () => {
			mockRoute.value.query = {
				direction: 'pull',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PULL_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});

		it('should ignore invalid direction values', async () => {
			// Set up modals as open so they can be closed
			mockUiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY] = { open: true };
			mockUiStore.modalsById[SOURCE_CONTROL_PULL_MODAL_KEY] = { open: true };

			mockRoute.value.query = {
				direction: 'invalid',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.closeModal).toHaveBeenCalledWith(SOURCE_CONTROL_PUSH_MODAL_KEY);
			expect(mockUiStore.closeModal).toHaveBeenCalledWith(SOURCE_CONTROL_PULL_MODAL_KEY);
		});

		it('should parse valid sourceControl query parameter', async () => {
			mockRoute.value.query = {
				sourceControl: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});
	});

	describe('diff modal handling', () => {
		it('should open diff modal when diff and direction are present', async () => {
			mockRoute.value.query = {
				diff: 'workflow-456',
				direction: 'pull',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: mockEventBus,
					workflowId: 'workflow-456',
					direction: 'pull',
				},
			});
		});

		it('should not open diff modal when diff is present but direction is missing', async () => {
			mockRoute.value.query = {
				diff: 'workflow-456',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).not.toHaveBeenCalledWith(
				expect.objectContaining({
					name: WORKFLOW_DIFF_MODAL_KEY,
				}),
			);
		});

		it('should close diff modal when diff param is removed', async () => {
			mockUiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY] = { open: true };

			mockRoute.value.query = {};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.closeModal).toHaveBeenCalledWith(WORKFLOW_DIFF_MODAL_KEY);
		});

		it('should not open diff modal if already open', async () => {
			mockUiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY] = { open: true };

			mockRoute.value.query = {
				diff: 'workflow-456',
				direction: 'pull',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).not.toHaveBeenCalled();
		});
	});

	describe('source control modal handling', () => {
		it('should open push modal when sourceControl=push', async () => {
			mockRoute.value.query = {
				sourceControl: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});

		it('should open pull modal when sourceControl=pull', async () => {
			mockRoute.value.query = {
				sourceControl: 'pull',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PULL_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});

		it('should not open source control modal when viewing diff', async () => {
			mockRoute.value.query = {
				sourceControl: 'push',
				diff: 'workflow-123',
				direction: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: mockEventBus,
					workflowId: 'workflow-123',
					direction: 'push',
				},
			});

			expect(mockUiStore.openModalWithData).not.toHaveBeenCalledWith(
				expect.objectContaining({
					name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				}),
			);
		});

		it('should reopen parent modal when returning from diff (direction without diff or sourceControl)', async () => {
			mockRoute.value.query = {
				direction: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});

		it('should preserve data when returning from diff modal', async () => {
			const existingData = { eventBus: mockEventBus, someData: 'test' };
			mockUiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY] = {
				data: existingData,
			};

			mockRoute.value.query = {
				direction: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: existingData,
			});
		});

		it('should not open source control modal if already open', async () => {
			mockUiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY] = { open: true };

			mockRoute.value.query = {
				sourceControl: 'push',
			};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.openModalWithData).not.toHaveBeenCalled();
		});

		it('should close both source control modals when no relevant params', async () => {
			mockUiStore.modalsById[SOURCE_CONTROL_PUSH_MODAL_KEY] = { open: true };
			mockUiStore.modalsById[SOURCE_CONTROL_PULL_MODAL_KEY] = { open: true };

			mockRoute.value.query = {};

			useWorkflowDiffRouting();
			await nextTick();

			expect(mockUiStore.closeModal).toHaveBeenCalledWith(SOURCE_CONTROL_PUSH_MODAL_KEY);
			expect(mockUiStore.closeModal).toHaveBeenCalledWith(SOURCE_CONTROL_PULL_MODAL_KEY);
		});
	});

	describe('route watching', () => {
		it('should react to query parameter changes', async () => {
			useWorkflowDiffRouting();
			vi.clearAllMocks();

			// Change route query
			mockRoute.value.query = {
				diff: 'workflow-789',
				direction: 'pull',
			};

			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: mockEventBus,
					workflowId: 'workflow-789',
					direction: 'pull',
				},
			});
		});

		it('should handle complex route transitions', async () => {
			useWorkflowDiffRouting();

			// Start with source control modal
			mockRoute.value.query = { sourceControl: 'push' };
			await nextTick();
			vi.clearAllMocks();

			// Transition to diff view
			mockRoute.value.query = {
				diff: 'workflow-123',
				direction: 'push',
			};
			await nextTick();

			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: WORKFLOW_DIFF_MODAL_KEY,
				data: {
					eventBus: mockEventBus,
					workflowId: 'workflow-123',
					direction: 'push',
				},
			});
			vi.clearAllMocks();

			// Set up diff modal as open so it can be closed
			mockUiStore.modalsById[WORKFLOW_DIFF_MODAL_KEY] = { open: true };

			// Return to parent modal
			mockRoute.value.query = { direction: 'push' };
			await nextTick();

			expect(mockUiStore.closeModal).toHaveBeenCalledWith(WORKFLOW_DIFF_MODAL_KEY);
			expect(mockUiStore.openModalWithData).toHaveBeenCalledWith({
				name: SOURCE_CONTROL_PUSH_MODAL_KEY,
				data: { eventBus: mockEventBus },
			});
		});
	});
});
