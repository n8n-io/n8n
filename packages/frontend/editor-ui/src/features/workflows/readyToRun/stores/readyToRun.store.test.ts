import { createPinia, setActivePinia } from 'pinia';
import { useReadyToRunStore } from './readyToRun.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPush, mockTrack, mockShowError, mockClaimFreeAiCredits, mockCreateNewWorkflow } =
	vi.hoisted(() => ({
		mockPush: vi.fn(),
		mockTrack: vi.fn(),
		mockShowError: vi.fn(),
		mockClaimFreeAiCredits: vi.fn(),
		mockCreateNewWorkflow: vi.fn(),
	}));

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: mockPush,
	}),
	useRoute: () => ({
		params: {},
	}),
}));

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

vi.mock('@/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
	}),
}));

const mockGetVariant = vi.fn();

vi.mock('@/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [],
		claimFreeAiCredits: mockClaimFreeAiCredits,
	}),
}));

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		createNewWorkflow: mockCreateNewWorkflow,
	}),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		currentUser: {
			settings: {},
		},
	}),
}));

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: () => ({
		isAiCreditsEnabled: true,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@vueuse/core', () => ({
	useLocalStorage: () => ({
		value: '',
	}),
}));

vi.mock('../composables/useEmptyStateDetection', () => ({
	useEmptyStateDetection: () => ({
		shouldShowSimplifiedLayout: vi.fn(() => false),
	}),
}));

describe('useReadyToRunStore', () => {
	let store: ReturnType<typeof useReadyToRunStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useReadyToRunStore();
	});

	describe('userCanClaimOpenAiCredits', () => {
		it('should return true when user can claim credits', () => {
			expect(store.userCanClaimOpenAiCredits).toBe(true);
		});
	});

	describe('trackExecuteAiWorkflow', () => {
		it('should track workflow execution', () => {
			store.trackExecuteAiWorkflow('success');

			expect(mockTrack).toHaveBeenCalledWith('User executed ready to run AI workflow', {
				status: 'success',
			});
		});

		it('should track workflow execution with failed status', () => {
			store.trackExecuteAiWorkflow('failed');

			expect(mockTrack).toHaveBeenCalledWith('User executed ready to run AI workflow', {
				status: 'failed',
			});
		});
	});

	describe('trackExecuteAiWorkflowSuccess', () => {
		it('should track successful workflow execution', () => {
			store.trackExecuteAiWorkflowSuccess();

			expect(mockTrack).toHaveBeenCalledWith('User executed ready to run AI workflow successfully');
		});
	});

	describe('claimFreeAiCredits', () => {
		it('should claim credits and track event', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);

			const result = await store.claimFreeAiCredits('project-123');

			expect(mockClaimFreeAiCredits).toHaveBeenCalledWith('project-123');
			expect(mockTrack).toHaveBeenCalledWith('User claimed OpenAI credits');
			expect(result).toEqual(mockCredential);
		});

		it('should show error on failure', async () => {
			const error = new Error('Failed to claim');
			mockClaimFreeAiCredits.mockRejectedValue(error);

			await expect(store.claimFreeAiCredits()).rejects.toThrow('Failed to claim');
			expect(mockShowError).toHaveBeenCalled();
		});
	});

	describe('createAndOpenAiWorkflow', () => {
		it('should create workflow and track event', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.createAndOpenAiWorkflow('card');

			expect(mockTrack).toHaveBeenCalledWith('User opened ready to run AI workflow', {
				source: 'card',
			});
			expect(mockCreateNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'AI Agent workflow',
					meta: { templateId: 'ready-to-run-ai-workflow' },
				}),
			);
			expect(mockPush).toHaveBeenCalledWith({
				name: 'NodeViewExisting',
				params: { name: 'workflow-123' },
			});
		});

		it('should track with button source', async () => {
			const mockWorkflow = { id: 'workflow-456', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.createAndOpenAiWorkflow('button');

			expect(mockTrack).toHaveBeenCalledWith('User opened ready to run AI workflow', {
				source: 'button',
			});
		});

		it('should create workflow with folder ID', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.createAndOpenAiWorkflow('button', 'folder-456');

			expect(mockCreateNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					parentFolderId: 'folder-456',
				}),
			);
		});

		it('should show error on failure', async () => {
			const error = new Error('Failed to create');
			mockCreateNewWorkflow.mockRejectedValue(error);

			await expect(store.createAndOpenAiWorkflow('card')).rejects.toThrow('Failed to create');
			expect(mockShowError).toHaveBeenCalled();
		});
	});

	describe('getCardVisibility', () => {
		it('should return true when user can create and env is not read-only', () => {
			expect(store.getCardVisibility(true, false)).toBe(true);
		});

		it('should return false when read-only', () => {
			expect(store.getCardVisibility(true, true)).toBe(false);
		});

		it('should return false when cannot create', () => {
			expect(store.getCardVisibility(false, false)).toBe(false);
		});
	});

	describe('getButtonVisibility', () => {
		it('should return true when all conditions met', () => {
			expect(store.getButtonVisibility(true, true, false)).toBe(true);
		});

		it('should return false when no workflows', () => {
			expect(store.getButtonVisibility(false, true, false)).toBe(false);
		});

		it('should return false when cannot create', () => {
			expect(store.getButtonVisibility(true, false, false)).toBe(false);
		});

		it('should return false when read-only', () => {
			expect(store.getButtonVisibility(true, true, true)).toBe(false);
		});
	});
});
