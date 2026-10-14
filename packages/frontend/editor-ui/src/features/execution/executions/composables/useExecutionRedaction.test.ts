import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useExecutionRedaction } from './useExecutionRedaction';
import { MODAL_CONFIRM } from '@/app/constants/modals';
import { useUIStore } from '@/app/stores/ui.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { flushPromises } from '@vue/test-utils';
import { effectScope } from 'vue';

const showError = vi.fn();
const confirm = vi.fn();
const track = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm }),
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({}),
	useRoute: () => ({ meta: {} }),
	RouterLink: vi.fn(),
}));

describe('useExecutionRedaction()', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;

	// The composable reads the execution through the injected workflow document
	// scope; with nothing provided it falls back to the workflows store's
	// (empty) workflow id, so seed the execution-state store keyed by that id.
	// Testing pinia makes store getters writable at runtime; the cast makes
	// that writability visible to the type checker.
	function setActiveExecution(execution: IExecutionResponse | null) {
		const executionStateStore = mockedStore(
			useWorkflowExecutionStateStore,
			createWorkflowDocumentId(''),
		) as unknown as { activeExecution: IExecutionResponse | null };
		executionStateStore.activeExecution = execution;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia({ stubActions: false });
		workflowsStore = mockedStore(useWorkflowsStore);
	});

	describe('computed properties', () => {
		it('should return isRedacted=false when no execution', () => {
			setActiveExecution(null);
			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(false);
			expect(canReveal.value).toBe(false);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should return isRedacted=true when redactionInfo.isRedacted is true', () => {
			setActiveExecution({
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			const { isRedacted, canReveal, isDynamicCredentials } = useExecutionRedaction();

			expect(isRedacted.value).toBe(true);
			expect(canReveal.value).toBe(true);
			expect(isDynamicCredentials.value).toBe(false);
		});

		it('should detect dynamic credentials reason', () => {
			setActiveExecution({
				data: {
					redactionInfo: {
						isRedacted: true,
						reason: 'dynamic_credentials',
						canReveal: false,
					},
				},
			} as never);

			const { isDynamicCredentials, canReveal } = useExecutionRedaction();

			expect(isDynamicCredentials.value).toBe(true);
			expect(canReveal.value).toBe(false);
		});
	});

	describe('credentialToShare', () => {
		const redactedForCredential = (credentialIds: string[]) =>
			({
				workflowData: {
					nodes: [{ credentials: { gmailOAuth2: { id: 'alice-gmail', name: "Alice's Gmail" } } }],
				},
				data: {
					redactionInfo: {
						isRedacted: true,
						reason: 'credential_inaccessible',
						canReveal: false,
						credentialIds,
					},
				},
			}) as unknown as IExecutionResponse;

		const viewerWith = (globalScopes: string[]) => {
			const usersStore = mockedStore(useUsersStore);
			usersStore.currentUser = { globalScopes } as never;
		};

		it('offers the credential to an owner or admin who can share it', () => {
			viewerWith(['credential:share']);
			setActiveExecution(redactedForCredential(['alice-gmail']));

			const { credentialToShare } = useExecutionRedaction();

			expect(credentialToShare.value).toEqual({ id: 'alice-gmail', name: "Alice's Gmail" });
		});

		it('offers nothing to a viewer who cannot share the credential', () => {
			viewerWith([]);
			setActiveExecution(redactedForCredential(['alice-gmail']));

			const { credentialToShare } = useExecutionRedaction();

			expect(credentialToShare.value).toBeUndefined();
		});

		it('offers nothing for another redaction reason', () => {
			viewerWith(['credential:share']);
			setActiveExecution({
				data: {
					redactionInfo: {
						isRedacted: true,
						reason: 'workflow_redaction_policy',
						canReveal: false,
					},
				},
			} as never);

			const { credentialToShare } = useExecutionRedaction();

			expect(credentialToShare.value).toBeUndefined();
		});

		it('opens the credential on its sharing tab', () => {
			viewerWith(['credential:share']);
			setActiveExecution(redactedForCredential(['alice-gmail']));
			const uiStore = mockedStore(useUIStore);

			useExecutionRedaction().openCredentialSharing();

			expect(uiStore.openExistingCredential).toHaveBeenCalledWith('alice-gmail', {
				initialTab: 'sharing',
			});
		});

		it('tracks the click on the sharing link', () => {
			viewerWith(['credential:share']);
			setActiveExecution({ ...redactedForCredential(['alice-gmail']), id: 'exec-123' });

			useExecutionRedaction().openCredentialSharing();

			expect(track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CREDENTIALS.USER_OPENED_CREDENTIAL_SHARING_FROM_REDACTED_DATA,
				{ credential_id: 'alice-gmail', workflow_id: '', execution_id: 'exec-123' },
			);
		});

		describe('after the credential modal closes', () => {
			const reloadedData = { resultData: { runData: { Node: [] } } };

			beforeEach(() => {
				viewerWith(['credential:share']);
				setActiveExecution({ ...redactedForCredential(['alice-gmail']), id: 'exec-123' });
				workflowsStore.fetchExecutionDataById = vi.fn().mockResolvedValue({ data: reloadedData });
			});

			it('reloads the execution when the sharing of the credential changed', async () => {
				const setExecutionRunDataSpy = vi.spyOn(
					useExecutionDataStore(createExecutionDataId('exec-123')),
					'setExecutionRunData',
				);

				useExecutionRedaction().openCredentialSharing();
				await useCredentialsStore().setCredentialSharedWith({
					credentialId: 'alice-gmail',
					sharedWithProjects: [],
				});
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledWith('exec-123', undefined);
				expect(setExecutionRunDataSpy).toHaveBeenCalledWith(reloadedData);
			});

			it('keeps listening while another modal opens over the credential modal', async () => {
				useExecutionRedaction().openCredentialSharing();
				// A modal on top makes the credential modal no longer the active one, but it
				// is still open, and the user can still change the sharing.
				useUIStore().openModal('someOtherModal');
				await flushPromises();
				await useCredentialsStore().setCredentialSharedWith({
					credentialId: 'alice-gmail',
					sharedWithProjects: [],
				});
				useUIStore().closeModal('someOtherModal');
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledTimes(1);
			});

			it('does not reload when the sharing did not change', async () => {
				useExecutionRedaction().openCredentialSharing();
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
			});

			it('stops listening when the panel goes away before the modal closes', async () => {
				const scope = effectScope();
				const redaction = scope.run(() => useExecutionRedaction());
				redaction?.openCredentialSharing();
				await useCredentialsStore().setCredentialSharedWith({
					credentialId: 'alice-gmail',
					sharedWithProjects: [],
				});

				scope.stop();
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
			});

			it('shows no error for a reload that fails after the panel went away', async () => {
				let rejectReload: (error: Error) => void = () => {};
				workflowsStore.fetchExecutionDataById = vi.fn(
					async () =>
						await new Promise((_resolve, reject) => {
							rejectReload = reject;
						}),
				);
				const scope = effectScope();
				const redaction = scope.run(() => useExecutionRedaction());
				redaction?.openCredentialSharing();
				await useCredentialsStore().setCredentialSharedWith({
					credentialId: 'alice-gmail',
					sharedWithProjects: [],
				});
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				scope.stop();
				rejectReload(new Error('Network error'));
				await flushPromises();

				expect(showError).not.toHaveBeenCalled();
			});

			it('stops listening once the modal closed', async () => {
				useExecutionRedaction().openCredentialSharing();
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				await useCredentialsStore().setCredentialSharedWith({
					credentialId: 'alice-gmail',
					sharedWithProjects: [],
				});
				useUIStore().openModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();
				useUIStore().closeModal(CREDENTIAL_EDIT_MODAL_KEY);
				await flushPromises();

				expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
			});
		});
	});

	describe('revealData', () => {
		it('should not fetch when user cancels confirmation', async () => {
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue('cancel');

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});

		it('should fetch with redactExecutionData=false on confirm', async () => {
			const revealedData = { resultData: { runData: { Node: [] } } };
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockResolvedValue({
				data: revealedData,
			});

			const executionDataStore = useExecutionDataStore(createExecutionDataId('exec-123'));
			const setExecutionRunDataSpy = vi.spyOn(executionDataStore, 'setExecutionRunData');

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).toHaveBeenCalledWith('exec-123', {
				redactExecutionData: false,
			});
			expect(setExecutionRunDataSpy).toHaveBeenCalledWith(revealedData);
		});

		it('should show error toast when fetch fails', async () => {
			setActiveExecution({
				id: 'exec-123',
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			const error = new Error('Forbidden');
			confirm.mockResolvedValue(MODAL_CONFIRM);
			workflowsStore.fetchExecutionDataById = vi.fn().mockRejectedValue(error);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		});

		it('should not fetch when execution id is missing', async () => {
			setActiveExecution({
				data: {
					redactionInfo: { isRedacted: true, reason: 'workflow_redaction_policy', canReveal: true },
				},
			} as never);

			confirm.mockResolvedValue(MODAL_CONFIRM);

			const { revealData } = useExecutionRedaction();
			await revealData();

			expect(workflowsStore.fetchExecutionDataById).not.toHaveBeenCalled();
		});
	});
});
