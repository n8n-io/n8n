import type { QuickConnectOption, QuickConnectPineconeOption } from '@n8n/api-types';
import { MODAL_CONFIRM, QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { computed, onBeforeUnmount, ref } from 'vue';

import type { ICredentialsResponse } from '../../credentials.types';
import { useCredentialOAuth } from '../../composables/useCredentialOAuth';
import { useCredentialsStore } from '../../credentials.store';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { getQuickConnectApiKey } from '../quickConnect.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useMessage } from '@/app/composables/useMessage';

export function useQuickConnect() {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const message = useMessage();
	const toast = useToast();
	const i18n = useI18n();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const rootStore = useRootStore();
	const loading = ref(false);
	const { isOAuthCredentialType, createAndAuthorize, cancelAuthorize } = useCredentialOAuth();
	const cleanUpHandlers: Array<() => void> = [];

	const isQuickConnectEnabled = computed(() =>
		posthogStore.isVariantEnabled(QUICK_CONNECT_EXPERIMENT.name, QUICK_CONNECT_EXPERIMENT.variant),
	);

	const optionsByCredentialType = computed(() => {
		const map = new Map<string, QuickConnectOption>();
		for (const option of settingsStore.moduleSettings['quick-connect']?.options ?? []) {
			map.set(option.credentialType, option);
		}
		return map;
	});

	const optionsByPackageName = computed(() => {
		const map = new Map<string, QuickConnectOption>();
		for (const option of settingsStore.moduleSettings['quick-connect']?.options ?? []) {
			if (!map.has(option.packageName)) {
				map.set(option.packageName, option);
			}
		}
		return map;
	});

	function getQuickConnectOption(
		credentialType: string,
		nodeType: string,
	): QuickConnectOption | undefined {
		if (!isQuickConnectEnabled.value || optionsByCredentialType.value.size === 0) {
			return undefined;
		}
		const option = optionsByCredentialType.value.get(credentialType);
		if (!option) return undefined;
		const pkg = nodeType.split('.')[0];
		return option.packageName.split('.')[0] === pkg ? option : undefined;
	}

	function getQuickConnectOptionByPackageName(packageName: string): QuickConnectOption | undefined {
		if (!isQuickConnectEnabled.value || optionsByPackageName.value.size === 0) {
			return undefined;
		}
		return optionsByPackageName.value.get(packageName);
	}

	function getQuickConnectOptionByCredentialTypes(
		credentialTypes: string[],
	): QuickConnectOption | undefined {
		if (!isQuickConnectEnabled.value || optionsByCredentialType.value.size === 0) {
			return undefined;
		}
		for (const type of credentialTypes) {
			const option = optionsByCredentialType.value.get(type);
			if (option) return option;
		}
		return undefined;
	}

	async function connectToPinecone(quickConnectOption: QuickConnectPineconeOption) {
		const { ConnectPopup } = await import('@pinecone-database/connect');

		return await new Promise<object | null>((resolve) => {
			const popup = ConnectPopup({
				onConnect: ({ key }) => resolve({ apiKey: key }),
				onCancel: () => resolve(null),
				integrationId: String(quickConnectOption.config.integrationId),
			});

			popup.open();
			cleanUpHandlers.push(() => popup.cleanup());
		});
	}

	async function connectViaBackendFlow(quickConnectOption: QuickConnectOption) {
		loading.value = true;
		return await getQuickConnectApiKey(rootStore.restApiContext, quickConnectOption);
	}

	async function getCredentialData(quickConnectOption: QuickConnectOption): Promise<object | null> {
		switch (quickConnectOption.quickConnectType) {
			case 'pinecone':
				return await connectToPinecone(quickConnectOption as QuickConnectPineconeOption);
			case 'firecrawl':
				return await connectViaBackendFlow(quickConnectOption);
			default:
				throw new Error(
					`Quick connect for type ${quickConnectOption.quickConnectType} is not implemented`,
				);
		}
	}

	function cleanUpDanglingHandlers() {
		cleanUpHandlers.splice(0, cleanUpHandlers.length).forEach((handler) => {
			try {
				handler();
			} catch {}
		});
	}

	onBeforeUnmount(cleanUpDanglingHandlers);

	async function connect(connectParams: {
		credentialTypeName: string;
		nodeType: string;
		source: 'node_type' | 'credential_type';
		serviceName: string;
	}): Promise<ICredentialsResponse | null> {
		cleanUpDanglingHandlers();
		const { credentialTypeName, nodeType, source } = connectParams;

		telemetry.track('User clicked quick connect button', {
			source,
			credential_type: credentialTypeName,
			node_type: nodeType,
		});

		if (isOAuthCredentialType(credentialTypeName)) {
			const credential = await createAndAuthorize(credentialTypeName, nodeType);
			return credential;
		}

		const quickConnectOption = getQuickConnectOption(credentialTypeName, nodeType);
		if (quickConnectOption) {
			const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
			if (!credentialType) {
				return null;
			}

			try {
				if (quickConnectOption.consentText) {
					const confirmed = await message.confirm(
						quickConnectOption.consentText,
						i18n.baseText('nodeCredentials.quickConnect.connectTo', {
							interpolate: { provider: connectParams.serviceName },
						}),
						{
							confirmButtonText: i18n.baseText('nodeCredentials.quickConnect.consent.confirm'),
							cancelButtonText: i18n.baseText('nodeCredentials.quickConnect.consent.cancel'),
						},
					);

					if (confirmed !== MODAL_CONFIRM) {
						return null;
					}
				}
				const credentialData = await getCredentialData(quickConnectOption);
				if (!credentialData) {
					// creation was aborted
					return null;
				}
				const credential = await credentialsStore.createNewCredential(
					{
						id: '',
						name: credentialType.displayName,
						type: credentialTypeName,
						data: {
							...credentialData,
							allowedHttpRequestDomains: 'none',
						},
					},
					projectsStore.currentProject?.id,
				);

				return credential;
			} catch (error) {
				toast.showError(
					error,
					i18n.baseText('credentialEdit.credentialEdit.showError.createCredential.title'),
				);
				return null;
			} finally {
				loading.value = false;
				cleanUpDanglingHandlers();
			}
		}

		return null;
	}

	return {
		loading,
		isQuickConnectEnabled,
		getQuickConnectOption,
		getQuickConnectOptionByPackageName,
		getQuickConnectOptionByCredentialTypes,
		connect,
		cancelConnect: cancelAuthorize,
	};
}
