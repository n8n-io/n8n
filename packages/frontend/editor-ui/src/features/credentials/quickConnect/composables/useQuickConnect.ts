import type { QuickConnectOption, QuickConnectPineconeOption } from '@n8n/api-types';
import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { computed } from 'vue';

import type { ICredentialsResponse } from '../../credentials.types';
import { useCredentialOAuth } from '../../composables/useCredentialOAuth';
import { useCredentialsStore } from '../../credentials.store';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';

async function connectToPinecone(quickConnectOption: QuickConnectPineconeOption) {
	const { ConnectPopup } = await import('@pinecone-database/connect');

	return await new Promise<string>((resolve, reject) => {
		const popup = ConnectPopup({
			onConnect: ({ key }) => resolve(key),
			onCancel: reject,
			integrationId: String(quickConnectOption.config.integrationId),
		});

		popup.open();
	});
}

export function useQuickConnect() {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const toast = useToast();
	const i18n = useI18n();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const { isOAuthCredentialType, createAndAuthorize, cancelAuthorize } = useCredentialOAuth();

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
		return option.packageName === pkg ? option : undefined;
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

	async function getApiKey(quickConnectOption: QuickConnectOption): Promise<string> {
		switch (quickConnectOption.quickConnectType) {
			case 'pinecone':
				return await connectToPinecone(quickConnectOption as QuickConnectPineconeOption);
			default:
				throw new Error(
					`Quick connect for type ${quickConnectOption.quickConnectType} is not implemented`,
				);
		}
	}

	async function connect(connectParams: {
		credentialTypeName: string;
		nodeType: string;
		source: string;
	}): Promise<ICredentialsResponse | null> {
		const { credentialTypeName, nodeType, source } = connectParams;

		telemetry.track('User clicked quick connect button', {
			source,
			credential_type: credentialTypeName,
			node_type: nodeType,
		});

		const quickConnectOption = getQuickConnectOption(credentialTypeName, nodeType);
		if (quickConnectOption) {
			const credentialType = credentialsStore.getCredentialTypeByName(credentialTypeName);
			if (!credentialType) {
				return null;
			}

			try {
				const apiKey = await getApiKey(quickConnectOption);
				const credential = await credentialsStore.createNewCredential(
					{
						id: '',
						name: credentialType.displayName,
						type: credentialTypeName,
						data: {
							apiKey,
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
			}
		}

		if (isOAuthCredentialType(credentialTypeName)) {
			const credential = await createAndAuthorize(credentialTypeName, nodeType);
			return credential;
		}

		return null;
	}

	return {
		isQuickConnectEnabled,
		getQuickConnectOption,
		getQuickConnectOptionByPackageName,
		getQuickConnectOptionByCredentialTypes,
		connect,
		cancelConnect: cancelAuthorize,
	};
}
