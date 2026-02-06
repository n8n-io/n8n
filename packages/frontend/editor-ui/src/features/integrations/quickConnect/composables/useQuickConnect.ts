import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed, type Ref, toRef } from 'vue';

type UseQuickConnectParams =
	| {
			packageName: string | Ref<string | undefined>;
			credentialType?: never;
	  }
	| {
			packageName?: never;
			credentialType: string | Ref<string | undefined>;
	  };

export function useQuickConnect({ credentialType, packageName }: UseQuickConnectParams) {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const quickConnectEnabled = posthogStore.isVariantEnabled(
		QUICK_CONNECT_EXPERIMENT.name,
		QUICK_CONNECT_EXPERIMENT.variant,
	);

	return computed(() => {
		if (quickConnectEnabled && settingsStore.moduleSettings['quick-connect']?.options.length) {
			const quickConnectOption = settingsStore.moduleSettings['quick-connect']?.options.find(
				(option) =>
					option.credentialType === toRef(credentialType).value ||
					option.packageName === toRef(packageName).value,
			);

			return quickConnectOption;
		}

		return undefined;
	});
}
