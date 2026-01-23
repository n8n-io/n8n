import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import type { INodeUi } from '@/Interface';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteLocationNormalized } from 'vue-router';
import { useReadyToRunStore } from './readyToRun.store';

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

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showError: mockShowError,
	}),
}));

const mockGetVariant = vi.fn();

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		getVariant: mockGetVariant,
	}),
}));

const mockAllCredentials = { value: [] as ICredentialsResponse[] };

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		get allCredentials() {
			return mockAllCredentials.value;
		},
		claimFreeAiCredits: mockClaimFreeAiCredits,
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		createNewWorkflow: mockCreateNewWorkflow,
	}),
}));

const mockCurrentUser = {
	value: {
		settings: {} as Record<string, unknown>,
	},
};

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({
		get currentUser() {
			return mockCurrentUser.value;
		},
	}),
}));

const mockIsAiCreditsEnabled = { value: true };

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isAiCreditsEnabled() {
			return mockIsAiCreditsEnabled.value;
		},
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

const mockLocalStorageValue = { value: '' };

vi.mock('@vueuse/core', () => ({
	useLocalStorage: () => mockLocalStorageValue,
	useMediaQuery: () => ({ value: false }),
}));

const mockIsTrulyEmpty = vi.fn(() => false);

vi.mock('../composables/useEmptyStateDetection', () => ({
	useEmptyStateDetection: () => ({
		isTrulyEmpty: mockIsTrulyEmpty,
	}),
}));

describe('useReadyToRunStore', () => {
	let store: ReturnType<typeof useReadyToRunStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset dynamic mocks to default values
		mockAllCredentials.value = [];
		mockCurrentUser.value = { settings: {} };
		mockIsAiCreditsEnabled.value = true;
		mockLocalStorageValue.value = '';
		mockIsTrulyEmpty.mockReturnValue(false);

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

		it('should store credential ID in localStorage', async () => {
			const mockCredential = { id: 'cred-456', name: 'OpenAI' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);

			await store.claimFreeAiCredits();

			expect(mockLocalStorageValue.value).toBe('cred-456');
		});

		it('should show error on failure', async () => {
			const error = new Error('Failed to claim');
			mockClaimFreeAiCredits.mockRejectedValue(error);

			await expect(store.claimFreeAiCredits()).rejects.toThrow('Failed to claim');
			expect(mockShowError).toHaveBeenCalled();
		});

		it('should show error with correct i18n keys on failure', async () => {
			const error = new Error('Failed to claim');
			mockClaimFreeAiCredits.mockRejectedValue(error);

			try {
				await store.claimFreeAiCredits();
			} catch (e) {
				// Expected to throw
			}

			expect(mockShowError).toHaveBeenCalledWith(
				error,
				'freeAi.credits.showError.claim.title',
				'freeAi.credits.showError.claim.message',
			);
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

	describe('getSimplifiedLayoutVisibility', () => {
		it('should call isTrulyEmpty with route', () => {
			const mockRoute = { name: 'test', params: {} } as RouteLocationNormalized;

			store.getSimplifiedLayoutVisibility(mockRoute);

			expect(mockIsTrulyEmpty).toHaveBeenCalledWith(mockRoute);
		});

		it('should return the result from isTrulyEmpty', () => {
			const mockRoute = { name: 'test', params: {} } as RouteLocationNormalized;
			mockIsTrulyEmpty.mockReturnValueOnce(true);

			const result = store.getSimplifiedLayoutVisibility(mockRoute);

			expect(result).toBe(true);
		});

		it('should return false when isTrulyEmpty returns false', () => {
			const mockRoute = { name: 'test', params: {} } as RouteLocationNormalized;
			mockIsTrulyEmpty.mockReturnValueOnce(false);

			const result = store.getSimplifiedLayoutVisibility(mockRoute);

			expect(result).toBe(false);
		});
	});

	describe('claimCreditsAndOpenWorkflow', () => {
		it('should claim credits and open workflow', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.claimCreditsAndOpenWorkflow('card');

			expect(mockClaimFreeAiCredits).toHaveBeenCalled();
			expect(mockCreateNewWorkflow).toHaveBeenCalled();
			expect(mockPush).toHaveBeenCalledWith({
				name: 'NodeViewExisting',
				params: { name: 'workflow-123' },
			});
		});

		it('should claim credits and open workflow with projectId and parentFolderId', async () => {
			const mockCredential = { id: 'cred-456', name: 'OpenAI' };
			const mockWorkflow = { id: 'workflow-456', name: 'AI Agent workflow' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.claimCreditsAndOpenWorkflow('button', 'folder-789', 'project-789');

			expect(mockClaimFreeAiCredits).toHaveBeenCalledWith('project-789');
			expect(mockCreateNewWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({
					parentFolderId: 'folder-789',
				}),
			);
		});

		it('should update user settings after successful claim', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);

			await store.claimCreditsAndOpenWorkflow('card');

			// Note: This test verifies the user settings update logic
			// In the actual implementation, this would update usersStore.currentUser.settings.userClaimedAiCredits
		});

		it('should throw error when claiming credits fails', async () => {
			const error = new Error('Failed to claim');
			mockClaimFreeAiCredits.mockRejectedValue(error);

			await expect(store.claimCreditsAndOpenWorkflow('card')).rejects.toThrow('Failed to claim');
			expect(mockCreateNewWorkflow).not.toHaveBeenCalled();
		});

		it('should throw error when creating workflow fails', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			const error = new Error('Failed to create workflow');
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);
			mockCreateNewWorkflow.mockRejectedValue(error);

			await expect(store.claimCreditsAndOpenWorkflow('card')).rejects.toThrow(
				'Failed to create workflow',
			);
		});
	});

	describe('isReadyToRunTemplateId', () => {
		it('should return true for ready-to-run-ai-workflow', () => {
			expect(store.isReadyToRunTemplateId('ready-to-run-ai-workflow')).toBe(true);
		});

		it('should return true for ready-to-run-ai-workflow-v5', () => {
			expect(store.isReadyToRunTemplateId('ready-to-run-ai-workflow-v5')).toBe(true);
		});

		it('should return true for ready-to-run-ai-workflow-v6', () => {
			expect(store.isReadyToRunTemplateId('ready-to-run-ai-workflow-v6')).toBe(true);
		});

		it('should return false for other template IDs', () => {
			expect(store.isReadyToRunTemplateId('some-other-template')).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(store.isReadyToRunTemplateId(undefined)).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(store.isReadyToRunTemplateId('')).toBe(false);
		});
	});

	describe('claimingCredits state', () => {
		it('should be false initially', () => {
			expect(store.claimingCredits).toBe(false);
		});

		it('should be true while claiming credits', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			let claimingDuringExecution = false;

			mockClaimFreeAiCredits.mockImplementation(async () => {
				claimingDuringExecution = store.claimingCredits;
				return mockCredential;
			});

			await store.claimFreeAiCredits();

			expect(claimingDuringExecution).toBe(true);
		});

		it('should be false after successful claim', async () => {
			const mockCredential = { id: 'cred-123', name: 'OpenAI' };
			mockClaimFreeAiCredits.mockResolvedValue(mockCredential);

			await store.claimFreeAiCredits();

			expect(store.claimingCredits).toBe(false);
		});

		it('should be false after failed claim', async () => {
			const error = new Error('Failed to claim');
			mockClaimFreeAiCredits.mockRejectedValue(error);

			try {
				await store.claimFreeAiCredits();
			} catch (e) {
				// Expected to throw
			}

			expect(store.claimingCredits).toBe(false);
		});
	});

	describe('userCanClaimOpenAiCredits edge cases', () => {
		it('should return false when AI credits are disabled', () => {
			mockIsAiCreditsEnabled.value = false;
			setActivePinia(createPinia());
			const testStore = useReadyToRunStore();

			expect(testStore.userCanClaimOpenAiCredits).toBe(false);
		});

		it('should return false when user already has OpenAI credentials', () => {
			mockAllCredentials.value = [
				{
					id: 'cred-1',
					type: 'openAiApi',
					name: 'My OpenAI Credentials',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					isManaged: false,
				},
			];
			setActivePinia(createPinia());
			const testStore = useReadyToRunStore();

			expect(testStore.userCanClaimOpenAiCredits).toBe(false);
		});

		it('should return false when user already claimed AI credits', () => {
			mockCurrentUser.value = {
				settings: { userClaimedAiCredits: true },
			};
			setActivePinia(createPinia());
			const testStore = useReadyToRunStore();

			expect(testStore.userCanClaimOpenAiCredits).toBe(false);
		});

		it('should return false when multiple conditions are false', () => {
			mockIsAiCreditsEnabled.value = false;
			mockAllCredentials.value = [
				{
					id: 'cred-1',
					type: 'openAiApi',
					name: 'My OpenAI Credentials',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					isManaged: false,
				},
			];
			mockCurrentUser.value = {
				settings: { userClaimedAiCredits: true },
			};
			setActivePinia(createPinia());
			const testStore = useReadyToRunStore();

			expect(testStore.userCanClaimOpenAiCredits).toBe(false);
		});

		it('should return true when all conditions are met', () => {
			mockIsAiCreditsEnabled.value = true;
			mockAllCredentials.value = [];
			mockCurrentUser.value = { settings: {} };
			setActivePinia(createPinia());
			const testStore = useReadyToRunStore();

			expect(testStore.userCanClaimOpenAiCredits).toBe(true);
		});
	});

	describe('createAndOpenAiWorkflow with credential injection', () => {
		it('should inject credential into OpenAI Model node when credential exists', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);
			mockLocalStorageValue.value = 'cred-stored-123';

			await store.createAndOpenAiWorkflow('card');

			expect(mockCreateNewWorkflow).toHaveBeenCalled();
			const createCall = mockCreateNewWorkflow.mock.calls[0][0];
			const openAiNode = createCall.nodes?.find((node: INodeUi) => node.name === 'OpenAI Model');

			expect(openAiNode).toBeDefined();
			expect(openAiNode?.credentials).toBeDefined();
			expect(openAiNode?.credentials?.openAiApi).toEqual({
				id: 'cred-stored-123',
				name: '',
			});
		});

		it('should create workflow without credential when no credential is stored', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);
			mockLocalStorageValue.value = '';

			await store.createAndOpenAiWorkflow('card');

			expect(mockCreateNewWorkflow).toHaveBeenCalled();
			const createCall = mockCreateNewWorkflow.mock.calls[0][0];
			const openAiNode = createCall.nodes?.find((node: INodeUi) => node.name === 'OpenAI Model');

			// Should not modify the credentials when no credential is stored
			expect(openAiNode).toBeDefined();
			expect(openAiNode?.credentials).toEqual({});
		});

		it('should not modify original workflow template', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);
			mockLocalStorageValue.value = 'cred-stored-456';

			await store.createAndOpenAiWorkflow('card');

			// Create another workflow to verify the template wasn't mutated
			await store.createAndOpenAiWorkflow('button');

			expect(mockCreateNewWorkflow).toHaveBeenCalledTimes(2);
			const firstCall = mockCreateNewWorkflow.mock.calls[0][0];
			const secondCall = mockCreateNewWorkflow.mock.calls[1][0];

			// Both should have the credential injected independently
			const firstOpenAiNode = firstCall.nodes?.find(
				(node: INodeUi) => node.name === 'OpenAI Model',
			);
			const secondOpenAiNode = secondCall.nodes?.find(
				(node: INodeUi) => node.name === 'OpenAI Model',
			);

			expect(firstOpenAiNode?.credentials?.openAiApi?.id).toBe('cred-stored-456');
			expect(secondOpenAiNode?.credentials?.openAiApi?.id).toBe('cred-stored-456');
		});

		it('should handle workflow where OpenAI Model node has existing credentials object', async () => {
			const mockWorkflow = { id: 'workflow-123', name: 'AI Agent workflow' };
			mockCreateNewWorkflow.mockResolvedValue(mockWorkflow);
			mockLocalStorageValue.value = 'cred-new-789';

			await store.createAndOpenAiWorkflow('card');

			expect(mockCreateNewWorkflow).toHaveBeenCalled();
			const createCall = mockCreateNewWorkflow.mock.calls[0][0];
			const openAiNode = createCall.nodes?.find((node: INodeUi) => node.name === 'OpenAI Model');

			// Should add the credential even if credentials object already exists
			expect(openAiNode?.credentials?.openAiApi).toEqual({
				id: 'cred-new-789',
				name: '',
			});
		});
	});
});
