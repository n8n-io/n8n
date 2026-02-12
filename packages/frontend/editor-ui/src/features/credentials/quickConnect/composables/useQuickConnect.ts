import type { QuickConnectOption } from '@n8n/api-types';
import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

type UseQuickConnectParams =
	| {
			credentialType: MaybeRefOrGetter<string>;
			nodeType: MaybeRefOrGetter<string>;
	  }
	| {
			credentialTypes: MaybeRefOrGetter<string[]>;
	  }
	| {
			packageName: MaybeRefOrGetter<string | undefined>;
	  };

export function useQuickConnect(params: UseQuickConnectParams) {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();

	const isQuickConnectEnabled = computed(() =>
		posthogStore.isVariantEnabled(QUICK_CONNECT_EXPERIMENT.name, QUICK_CONNECT_EXPERIMENT.variant),
	);

	const quickConnectOptions = computed<QuickConnectOption[]>(
		() => settingsStore.moduleSettings['quick-connect']?.options ?? [],
	);

	function findByCredentialTypeAndNodeType(
		credentialType: string,
		nodeType: string,
	): QuickConnectOption | undefined {
		const pkg = nodeType.split('.')[0];
		return quickConnectOptions.value.find(
			(option) => option.credentialType === credentialType && option.packageName === pkg,
		);
	}

	function getQuickConnectOption(
		credentialType: string,
		nodeType: string,
	): QuickConnectOption | undefined {
		if (!isQuickConnectEnabled.value || !quickConnectOptions.value.length) {
			return undefined;
		}
		return findByCredentialTypeAndNodeType(credentialType, nodeType);
	}

	const quickConnectOption = computed<QuickConnectOption | undefined>(() => {
		if (!isQuickConnectEnabled.value || !quickConnectOptions.value.length) {
			return undefined;
		}

		if ('credentialType' in params && params.credentialType !== undefined) {
			return findByCredentialTypeAndNodeType(
				toValue(params.credentialType),
				toValue(params.nodeType),
			);
		}

		if ('credentialTypes' in params && params.credentialTypes !== undefined) {
			const types = toValue(params.credentialTypes);
			return quickConnectOptions.value.find((option) => types.includes(option.credentialType));
		}

		if ('packageName' in params && params.packageName !== undefined) {
			const pkg = toValue(params.packageName);
			return quickConnectOptions.value.find((option) => option.packageName === pkg);
		}

		return undefined;
	});

	return {
		isQuickConnectEnabled,
		quickConnectOption,
		getQuickConnectOption,
	};
}
