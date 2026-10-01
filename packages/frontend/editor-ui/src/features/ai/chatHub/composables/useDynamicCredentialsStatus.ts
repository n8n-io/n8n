import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchWorkflowExecutionStatus,
	authorizeDynamicCredential,
	revokeDynamicCredential,
} from '@/features/ai/chatHub/chat.api';
import type { WorkflowExecutionStatus } from '@n8n/api-types';
import {
	getTrustedOAuthOrigins,
	waitForOAuthCallback,
} from '@/features/credentials/composables/oauthCallback';

export interface DynamicCredentialItem {
	credentialId: string;
	credentialName: string;
	credentialType: string;
	credentialStatus: 'missing' | 'configured' | 'resolver_missing';
	resolverId: string;
	isConnecting: boolean;
	error: string | null;
}

function parseResolverId(authorizationUrl: string | undefined): string {
	if (!authorizationUrl) return '';
	try {
		return new URL(authorizationUrl).searchParams.get('resolverId') ?? '';
	} catch {
		return '';
	}
}

export function useDynamicCredentialsStatus(workflowId: Ref<string | null>) {
	const rootStore = useRootStore();

	const credentials = ref<DynamicCredentialItem[]>([]);
	const isLoading = ref(false);

	const hasDynamicCredentials = computed(() => credentials.value.length > 0);
	const allAuthenticated = computed(
		() =>
			hasDynamicCredentials.value &&
			credentials.value.every((c) => c.credentialStatus === 'configured'),
	);
	const connectedCount = computed(
		() => credentials.value.filter((c) => c.credentialStatus === 'configured').length,
	);
	const totalCount = computed(() => credentials.value.length);

	async function fetchStatus() {
		const id = workflowId.value;
		if (!id) {
			credentials.value = [];
			return;
		}

		isLoading.value = true;
		try {
			const status: WorkflowExecutionStatus = await fetchWorkflowExecutionStatus(
				rootStore.restApiContext,
				id,
			);

			// Refreshing must not reset in-flight connection state: authorize()
			// verifies pending OAuth flows by re-fetching the status, and dropping
			// `isConnecting` here would re-enable Connect mid-flow.
			const connecting = new Set(
				credentials.value.filter((c) => c.isConnecting).map((c) => c.credentialId),
			);
			credentials.value = (status.credentials ?? []).map((c) => ({
				credentialId: c.credentialId,
				credentialName: c.credentialName,
				credentialType: c.credentialType,
				credentialStatus: c.credentialStatus,
				resolverId: parseResolverId(c.authorizationUrl),
				isConnecting: connecting.has(c.credentialId),
				error: null,
			}));
		} catch {
			credentials.value = [];
		} finally {
			isLoading.value = false;
		}
	}

	// fetchStatus() replaces the credential objects, so long-running flows must
	// update state by id instead of holding on to a stale array item.
	function updateCredentialState(
		credentialId: string,
		update: Partial<Pick<DynamicCredentialItem, 'isConnecting' | 'error'>>,
	) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (cred) Object.assign(cred, update);
	}

	async function pollUntilConfigured(credentialId: string, maxAttempts = 10, intervalMs = 1000) {
		for (let i = 0; i < maxAttempts; i++) {
			await fetchStatus();
			const cred = credentials.value.find((c) => c.credentialId === credentialId);
			if (cred?.credentialStatus === 'configured') return;
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}
	}

	async function authorize(credentialId: string) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (!cred || cred.isConnecting) return;

		updateCredentialState(credentialId, { isConnecting: true, error: null });

		try {
			const oauthUrl = await authorizeDynamicCredential(
				rootStore.restApiContext,
				credentialId,
				cred.resolverId,
			);

			// XSS protection: validate URL protocol
			const allowedProtocols = ['http:', 'https:'];
			try {
				const parsedUrl = new URL(oauthUrl);
				if (!allowedProtocols.includes(parsedUrl.protocol)) {
					updateCredentialState(credentialId, {
						error: 'Invalid authorization URL',
						isConnecting: false,
					});
					return;
				}
			} catch {
				updateCredentialState(credentialId, {
					error: 'Invalid authorization URL',
					isConnecting: false,
				});
				return;
			}

			// Open OAuth popup
			const params =
				'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
			const oauthPopup = window.open(oauthUrl, 'OAuth Authorization', params);

			if (!oauthPopup) {
				updateCredentialState(credentialId, {
					error: 'Failed to start authorization',
					isConnecting: false,
				});
				return;
			}

			const outcome = await waitForOAuthCallback({
				popup: oauthPopup,
				trustedOrigins: getTrustedOAuthOrigins(rootStore.urlBaseEditor),
				verifyConnected: async () => {
					await fetchStatus();
					return (
						credentials.value.find((c) => c.credentialId === credentialId)?.credentialStatus ===
						'configured'
					);
				},
			});

			oauthPopup.close();

			if (outcome === 'success') {
				await pollUntilConfigured(credentialId);
			} else {
				await fetchStatus();
			}
			updateCredentialState(credentialId, { isConnecting: false });
		} catch {
			updateCredentialState(credentialId, {
				error: 'Failed to start authorization',
				isConnecting: false,
			});
		}
	}

	async function revoke(credentialId: string) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (!cred || cred.isConnecting) return;

		updateCredentialState(credentialId, { isConnecting: true, error: null });

		try {
			await revokeDynamicCredential(rootStore.restApiContext, credentialId, cred.resolverId);
			await fetchStatus();
		} catch {
			updateCredentialState(credentialId, { error: 'Failed to disconnect credential' });
		} finally {
			updateCredentialState(credentialId, { isConnecting: false });
		}
	}

	// Auto-fetch when workflowId changes
	watch(
		workflowId,
		(newId) => {
			if (newId) {
				void fetchStatus();
			} else {
				credentials.value = [];
			}
		},
		{ immediate: true },
	);

	return {
		credentials: credentials as Ref<DynamicCredentialItem[]>,
		hasDynamicCredentials: hasDynamicCredentials as ComputedRef<boolean>,
		allAuthenticated: allAuthenticated as ComputedRef<boolean>,
		connectedCount: connectedCount as ComputedRef<number>,
		totalCount: totalCount as ComputedRef<number>,
		isLoading: isLoading as Ref<boolean>,
		fetchStatus,
		authorize,
		revoke,
	};
}
