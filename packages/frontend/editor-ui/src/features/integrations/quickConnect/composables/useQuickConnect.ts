import { QUICK_CONNECT_EXPERIMENT } from '@/app/constants';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed, type Ref, toRef } from 'vue';

type UseQuickConnectParams =
	| {
			packageName: string | Ref<string | undefined>;
			credentialTypes?: never;
	  }
	| {
			packageName?: never;
			credentialTypes: string[] | Ref<string[]>;
	  };

export function useQuickConnect({ credentialTypes, packageName }: UseQuickConnectParams) {
	const settingsStore = useSettingsStore();
	const posthogStore = usePostHog();
	const quickConnectEnabled = posthogStore.isVariantEnabled(
		QUICK_CONNECT_EXPERIMENT.name,
		QUICK_CONNECT_EXPERIMENT.variant,
	);

	return computed(() => {
		if (quickConnectEnabled && settingsStore.moduleSettings['quick-connect']?.options.length) {
			const options = settingsStore.moduleSettings['quick-connect']?.options;

			if (credentialTypes) {
				const types = toRef(credentialTypes).value;
				return options.find((option) => types.includes(option.credentialType));
			}

			if (packageName) {
				return options.find((option) => option.packageName === toRef(packageName).value);
			}
		}

		return undefined;
	});
}
