import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useDynamicCredentialsStatus } from './useDynamicCredentialsStatus';
import type { WorkflowExecutionStatus } from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: '/rest' },
	})),
}));

const mockFetchWorkflowExecutionStatus = vi.fn();
const mockAuthorizeDynamicCredential = vi.fn();
const mockRevokeDynamicCredential = vi.fn();

vi.mock('@/features/ai/chatHub/chat.api', () => ({
	fetchWorkflowExecutionStatus: (...args: unknown[]) => mockFetchWorkflowExecutionStatus(...args),
	authorizeDynamicCredential: (...args: unknown[]) => mockAuthorizeDynamicCredential(...args),
	revokeDynamicCredential: (...args: unknown[]) => mockRevokeDynamicCredential(...args),
}));

function createExecutionStatus(
	overrides: Partial<WorkflowExecutionStatus> = {},
): WorkflowExecutionStatus {
	return {
		workflowId: 'wf-1',
		readyToExecute: false,
		credentials: [
			{
				credentialId: 'cred-1',
				credentialName: 'Google Sheets',
				credentialType: 'googleSheetsOAuth2Api',
				credentialStatus: 'missing',
				authorizationUrl:
					'https://n8n.example.com/rest/credentials/cred-1/authorize?resolverId=resolver-1',
				revokeUrl: 'https://n8n.example.com/rest/credentials/cred-1/revoke?resolverId=resolver-1',
			},
			{
				credentialId: 'cred-2',
				credentialName: 'Gmail',
				credentialType: 'gmailOAuth2Api',
				credentialStatus: 'configured',
				authorizationUrl:
					'https://n8n.example.com/rest/credentials/cred-2/authorize?resolverId=resolver-2',
				revokeUrl: 'https://n8n.example.com/rest/credentials/cred-2/revoke?resolverId=resolver-2',
			},
		],
		...overrides,
	};
}

describe('useDynamicCredentialsStatus', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
		mockFetchWorkflowExecutionStatus.mockResolvedValue(createExecutionStatus());
	});

	describe('initialization', () => {
		it('should fetch status when workflowId is set', async () => {
			const workflowId = ref<string | null>('wf-1');
			useDynamicCredentialsStatus(workflowId);

			await nextTick();
			await vi.waitFor(() => {
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalledWith({ baseUrl: '/rest' }, 'wf-1');
			});
		});

		it('should not fetch when workflowId is null', async () => {
			const workflowId = ref<string | null>(null);
			useDynamicCredentialsStatus(workflowId);

			await nextTick();
			expect(mockFetchWorkflowExecutionStatus).not.toHaveBeenCalled();
		});

		it('should reset credentials when workflowId changes to null', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { credentials } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			workflowId.value = null;
			await nextTick();
			expect(credentials.value).toHaveLength(0);
		});

		it('should re-fetch when workflowId changes', async () => {
			const workflowId = ref<string | null>('wf-1');
			useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalledTimes(1);
			});

			workflowId.value = 'wf-2';
			await nextTick();

			await vi.waitFor(() => {
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalledTimes(2);
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenLastCalledWith(
					{ baseUrl: '/rest' },
					'wf-2',
				);
			});
		});
	});

	describe('computed properties', () => {
		it('should compute hasDynamicCredentials correctly', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { hasDynamicCredentials } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(hasDynamicCredentials.value).toBe(true);
			});
		});

		it('should return false for hasDynamicCredentials when no credentials', async () => {
			mockFetchWorkflowExecutionStatus.mockResolvedValue(
				createExecutionStatus({ credentials: [] }),
			);

			const workflowId = ref<string | null>('wf-1');
			const { hasDynamicCredentials } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(hasDynamicCredentials.value).toBe(false);
			});
		});

		it('should compute allAuthenticated as false when some are missing', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { allAuthenticated } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(allAuthenticated.value).toBe(false);
			});
		});

		it('should compute allAuthenticated as true when all are configured', async () => {
			mockFetchWorkflowExecutionStatus.mockResolvedValue(
				createExecutionStatus({
					credentials: [
						{
							credentialId: 'cred-1',
							credentialName: 'Google Sheets',
							credentialType: 'googleSheetsOAuth2Api',
							credentialStatus: 'configured',
						},
						{
							credentialId: 'cred-2',
							credentialName: 'Gmail',
							credentialType: 'gmailOAuth2Api',
							credentialStatus: 'configured',
						},
					],
					readyToExecute: true,
				}),
			);

			const workflowId = ref<string | null>('wf-1');
			const { allAuthenticated } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(allAuthenticated.value).toBe(true);
			});
		});

		it('should compute connectedCount and totalCount', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { connectedCount, totalCount } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(connectedCount.value).toBe(1);
				expect(totalCount.value).toBe(2);
			});
		});
	});

	describe('credential parsing', () => {
		it('should parse resolverId from authorizationUrl', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { credentials } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value[0].resolverId).toBe('resolver-1');
				expect(credentials.value[1].resolverId).toBe('resolver-2');
			});
		});

		it('should handle missing authorizationUrl', async () => {
			mockFetchWorkflowExecutionStatus.mockResolvedValue(
				createExecutionStatus({
					credentials: [
						{
							credentialId: 'cred-1',
							credentialName: 'Test',
							credentialType: 'testOAuth2Api',
							credentialStatus: 'missing',
						},
					],
				}),
			);

			const workflowId = ref<string | null>('wf-1');
			const { credentials } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value[0].resolverId).toBe('');
			});
		});
	});

	describe('fetchStatus', () => {
		it('should set isLoading during fetch', async () => {
			let resolvePromise: (value: WorkflowExecutionStatus) => void;
			mockFetchWorkflowExecutionStatus.mockReturnValue(
				new Promise<WorkflowExecutionStatus>((resolve) => {
					resolvePromise = resolve;
				}),
			);

			const workflowId = ref<string | null>('wf-1');
			const { isLoading } = useDynamicCredentialsStatus(workflowId);

			await nextTick();
			expect(isLoading.value).toBe(true);

			resolvePromise!(createExecutionStatus());
			await vi.waitFor(() => {
				expect(isLoading.value).toBe(false);
			});
		});

		it('should clear credentials on fetch error', async () => {
			mockFetchWorkflowExecutionStatus.mockRejectedValue(new Error('Network error'));

			const workflowId = ref<string | null>('wf-1');
			const { credentials, isLoading } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(0);
				expect(isLoading.value).toBe(false);
			});
		});
	});

	describe('pollUntilConfigured', () => {
		it('should stop polling once credential becomes configured', async () => {
			vi.useFakeTimers();

			const workflowId = ref<string | null>('wf-1');
			const { credentials, authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			// Authorize returns a valid URL, popup opens
			mockAuthorizeDynamicCredential.mockResolvedValue('https://accounts.google.com/oauth');
			const mockPopup = { closed: false, close: vi.fn() };
			vi.stubGlobal(
				'open',
				vi.fn(() => mockPopup),
			);

			const authorizePromise = authorize('cred-1');

			// Simulate popup closing
			mockPopup.closed = true;

			// First poll: still missing
			mockFetchWorkflowExecutionStatus.mockResolvedValue(createExecutionStatus());
			await vi.advanceTimersByTimeAsync(500); // popup-closed poll fires

			// Second poll after 1s delay: now configured
			mockFetchWorkflowExecutionStatus.mockResolvedValue(
				createExecutionStatus({
					credentials: [
						{
							credentialId: 'cred-1',
							credentialName: 'Google Sheets',
							credentialType: 'googleSheetsOAuth2Api',
							credentialStatus: 'configured',
							authorizationUrl:
								'https://n8n.example.com/rest/credentials/cred-1/authorize?resolverId=resolver-1',
							revokeUrl:
								'https://n8n.example.com/rest/credentials/cred-1/revoke?resolverId=resolver-1',
						},
						{
							credentialId: 'cred-2',
							credentialName: 'Gmail',
							credentialType: 'gmailOAuth2Api',
							credentialStatus: 'configured',
							authorizationUrl:
								'https://n8n.example.com/rest/credentials/cred-2/authorize?resolverId=resolver-2',
							revokeUrl:
								'https://n8n.example.com/rest/credentials/cred-2/revoke?resolverId=resolver-2',
						},
					],
					readyToExecute: true,
				}),
			);
			await vi.advanceTimersByTimeAsync(1000); // pollUntilConfigured delay

			await authorizePromise;

			expect(credentials.value[0].credentialStatus).toBe('configured');
			expect(credentials.value[0].isConnecting).toBe(false);

			vi.useRealTimers();
			vi.unstubAllGlobals();
		});

		it('should stop after max attempts even if still missing', async () => {
			vi.useFakeTimers();

			const workflowId = ref<string | null>('wf-1');
			const { credentials, authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			mockAuthorizeDynamicCredential.mockResolvedValue('https://accounts.google.com/oauth');
			const mockPopup = { closed: false, close: vi.fn() };
			vi.stubGlobal(
				'open',
				vi.fn(() => mockPopup),
			);

			const authorizePromise = authorize('cred-1');

			// Popup closes
			mockPopup.closed = true;

			// All polls return missing — never becomes configured
			mockFetchWorkflowExecutionStatus.mockResolvedValue(createExecutionStatus());

			// Trigger popup-closed detection + all 10 poll attempts (500ms + 10 * 1000ms)
			await vi.advanceTimersByTimeAsync(500 + 10 * 1000);
			await authorizePromise;

			// Should have stopped and set isConnecting to false
			expect(credentials.value[0].credentialStatus).toBe('missing');
			expect(credentials.value[0].isConnecting).toBe(false);

			vi.useRealTimers();
			vi.unstubAllGlobals();
		});
	});

	describe('authorize', () => {
		it('should reject invalid URL protocols', async () => {
			mockAuthorizeDynamicCredential.mockResolvedValue('javascript:alert(1)');

			const workflowId = ref<string | null>('wf-1');
			const { credentials, authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			await authorize('cred-1');

			expect(credentials.value[0].error).toBe('Invalid authorization URL');
			expect(credentials.value[0].isConnecting).toBe(false);
		});

		it('should open popup with valid OAuth URL', async () => {
			const mockOpen = vi.fn(() => ({ close: vi.fn() }));
			vi.stubGlobal('open', mockOpen);

			mockAuthorizeDynamicCredential.mockResolvedValue('https://accounts.google.com/oauth');

			const workflowId = ref<string | null>('wf-1');
			const { credentials, authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			await authorize('cred-1');

			expect(mockOpen).toHaveBeenCalledWith(
				'https://accounts.google.com/oauth',
				'OAuth Authorization',
				expect.any(String),
			);

			vi.unstubAllGlobals();
		});

		it('should set error when authorize API fails', async () => {
			mockAuthorizeDynamicCredential.mockRejectedValue(new Error('Server error'));

			const workflowId = ref<string | null>('wf-1');
			const { credentials, authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			await authorize('cred-1');

			expect(credentials.value[0].error).toBe('Failed to start authorization');
			expect(credentials.value[0].isConnecting).toBe(false);
		});

		it('should do nothing for unknown credentialId', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { authorize } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalled();
			});

			await authorize('unknown-id');
			expect(mockAuthorizeDynamicCredential).not.toHaveBeenCalled();
		});
	});

	describe('revoke', () => {
		it('should call revoke API and re-fetch status', async () => {
			mockRevokeDynamicCredential.mockResolvedValue(undefined);

			const workflowId = ref<string | null>('wf-1');
			const { credentials, revoke } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			mockFetchWorkflowExecutionStatus.mockClear();
			await revoke('cred-2');

			expect(mockRevokeDynamicCredential).toHaveBeenCalledWith(
				{ baseUrl: '/rest' },
				'cred-2',
				'resolver-2',
			);
			expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalled();
		});

		it('should set error when revoke fails', async () => {
			mockRevokeDynamicCredential.mockRejectedValue(new Error('Server error'));

			const workflowId = ref<string | null>('wf-1');
			const { credentials, revoke } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(credentials.value).toHaveLength(2);
			});

			await revoke('cred-2');

			expect(credentials.value[1].error).toBe('Failed to disconnect credential');
			expect(credentials.value[1].isConnecting).toBe(false);
		});

		it('should do nothing for unknown credentialId', async () => {
			const workflowId = ref<string | null>('wf-1');
			const { revoke } = useDynamicCredentialsStatus(workflowId);

			await vi.waitFor(() => {
				expect(mockFetchWorkflowExecutionStatus).toHaveBeenCalled();
			});

			await revoke('unknown-id');
			expect(mockRevokeDynamicCredential).not.toHaveBeenCalled();
		});
	});
});
