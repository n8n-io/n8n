import type { QuickConnectOption } from '@n8n/api-types';
import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed } from 'vue';

import type { ICredentialsResponse } from '../../credentials.types';
import { useCredentialOAuth } from '../../composables/useCredentialOAuth';

export function useQuickConnect() {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
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

		if (getQuickConnectOption(credentialTypeName, nodeType)) {
			// TODO: Implement quick connect flows here
			return null;
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
