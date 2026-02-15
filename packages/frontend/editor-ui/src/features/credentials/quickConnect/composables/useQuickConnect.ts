import type { QuickConnectOption } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { computed, ref } from 'vue';

import { useCredentialOAuth } from '../../composables/useCredentialOAuth';
import { useCredentialsStore } from '../../credentials.store';
import type { ICredentialsResponse } from '../../credentials.types';
import { createQuickConnectCredential } from '../quickConnect.api';

export function useQuickConnect() {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const credentialsStore = useCredentialsStore();
	const projectsStore = useProjectsStore();
	const posthogStore = usePostHog();
	const telemetry = useTelemetry();
	const { isOAuthCredentialType, createAndAuthorize, cancelAuthorize } = useCredentialOAuth();

	const isQuickConnectEnabled = computed(() =>
		posthogStore.isVariantEnabled(QUICK_CONNECT_EXPERIMENT.name, QUICK_CONNECT_EXPERIMENT.variant),
	);

	const showConsentDialog = ref(false);
	const consentDialogOption = ref<QuickConnectOption | null>(null);
	let resolveConsentPromise: ((confirmed: boolean) => void) | null = null;

	async function requestConsent(option: QuickConnectOption): Promise<boolean> {
		consentDialogOption.value = option;
		showConsentDialog.value = true;
		return await new Promise<boolean>((resolve) => {
			resolveConsentPromise = resolve;
		});
	}

	function onConsentConfirm() {
		showConsentDialog.value = false;
		resolveConsentPromise?.(true);
		resolveConsentPromise = null;
	}

	function onConsentCancel() {
		showConsentDialog.value = false;
		consentDialogOption.value = null;
		resolveConsentPromise?.(false);
		resolveConsentPromise = null;
	}

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

	// TODO: telemetry
	async function createBackendCredential(
		option: QuickConnectOption,
	): Promise<ICredentialsResponse> {
		const credential = await createQuickConnectCredential(rootStore.restApiContext, {
			credentialType: option.credentialType,
			projectId: projectsStore.currentProject?.id,
		});
		credentialsStore.upsertCredential(credential);
		return credential;
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

		const option = getQuickConnectOption(credentialTypeName, nodeType);
		if (option) {
			if (option.quickConnectType === 'backend' && option.consentText) {
				const confirmed = await requestConsent(option);
				if (!confirmed) {
					return null;
				}

				return await createBackendCredential(option);
			}

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
		showConsentDialog,
		consentDialogOption,
		onConsentConfirm,
		onConsentCancel,
	};
}
