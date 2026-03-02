import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	fetchWorkflowExecutionStatus,
	authorizeDynamicCredential,
	revokeDynamicCredential,
} from '@/features/ai/chatHub/chat.api';
import type { WorkflowExecutionStatus } from '@n8n/api-types';

export interface DynamicCredentialItem {
	credentialId: string;
	credentialName: string;
	credentialType: string;
	credentialStatus: 'missing' | 'configured';
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

			credentials.value = (status.credentials ?? []).map((c) => ({
				credentialId: c.credentialId,
				credentialName: c.credentialName,
				credentialType: c.credentialType,
				credentialStatus: c.credentialStatus,
				resolverId: parseResolverId(c.authorizationUrl),
				isConnecting: false,
				error: null,
			}));
		} catch {
			credentials.value = [];
		} finally {
			isLoading.value = false;
		}
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
		if (!cred) return;

		cred.isConnecting = true;
		cred.error = null;

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
					cred.error = 'Invalid authorization URL';
					cred.isConnecting = false;
					return;
				}
			} catch {
				cred.error = 'Invalid authorization URL';
				cred.isConnecting = false;
				return;
			}

			// Open OAuth popup
			const params =
				'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
			const oauthPopup = window.open(oauthUrl, 'OAuth Authorization', params);

			// Listen for OAuth callback via BroadcastChannel
			const oauthChannel = new BroadcastChannel('oauth-callback');
			let settled = false;

			const settle = async () => {
				if (settled) return;
				settled = true;
				oauthChannel.close();
				clearInterval(pollInterval);
				await pollUntilConfigured(credentialId);
				cred.isConnecting = false;
			};

			oauthChannel.addEventListener('message', async (event: MessageEvent) => {
				if (event.data === 'success') {
					if (oauthPopup) oauthPopup.close();
					await settle();
				}
			});

			// Fallback: poll for popup closed (handles cross-origin dev env)
			const pollInterval = setInterval(() => {
				if (oauthPopup?.closed) {
					void settle();
				}
			}, 500);
		} catch {
			cred.error = 'Failed to start authorization';
			cred.isConnecting = false;
		}
	}

	async function revoke(credentialId: string) {
		const cred = credentials.value.find((c) => c.credentialId === credentialId);
		if (!cred) return;

		cred.isConnecting = true;
		cred.error = null;

		try {
			await revokeDynamicCredential(rootStore.restApiContext, credentialId, cred.resolverId);
			await fetchStatus();
		} catch {
			cred.error = 'Failed to disconnect credential';
		} finally {
			cred.isConnecting = false;
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
