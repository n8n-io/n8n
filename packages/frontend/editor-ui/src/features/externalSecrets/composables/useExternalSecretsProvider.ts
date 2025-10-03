import type { IUpdateInformation } from '@/Interface';
import type {
	ExternalSecretsProvider,
	ExternalSecretsProviderData,
	ExternalSecretsProviderProperty,
	ExternalSecretsProviderState,
} from '../externalSecrets.types';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';
import { useExternalSecretsStore } from '@/features/externalSecrets/externalSecrets.ee.store';
import { useToast } from '@/composables/useToast';

export function useExternalSecretsProvider(
	provider:
		| Ref<ExternalSecretsProvider | undefined>
		| ComputedRef<ExternalSecretsProvider | undefined>,
	providerData: Ref<ExternalSecretsProviderData>,
) {
	const toast = useToast();
	const externalSecretsStore = useExternalSecretsStore();

	const initialConnectionState = ref<ExternalSecretsProvider['state'] | undefined>('initializing');
	const connectionState = computed(
		() => externalSecretsStore.connectionState[provider.value?.name ?? ''],
	);
	const setConnectionState = (state: ExternalSecretsProvider['state']) => {
		if (!provider.value) {
			return;
		}

		externalSecretsStore.setConnectionState(provider.value.name, state);
	};

	const normalizedProviderData = computed(() => {
		return Object.entries(providerData.value).reduce(
			(acc, [key, value]) => {
				const property = provider.value?.properties?.find((p) => p.name === key);
				if (property && shouldDisplayProperty(property)) {
					acc[key] = value;
				}

				return acc;
			},
			{} as Record<string, IUpdateInformation['value']>,
		);
	});

	function shouldDisplayProperty(property: ExternalSecretsProviderProperty): boolean {
		let visible = true;

		if (property.displayOptions?.show) {
			visible =
				visible &&
				Object.entries(property.displayOptions.show).every(([key, value]) => {
					return value?.includes(providerData.value[key] as string);
				});
		}

		if (property.displayOptions?.hide) {
			visible =
				visible &&
				!Object.entries(property.displayOptions.hide).every(([key, value]) => {
					return value?.includes(providerData.value[key] as string);
				});
		}

		return visible;
	}

	async function testConnection(
		options: { showError?: boolean } = { showError: true },
	): Promise<ExternalSecretsProviderState> {
		if (!provider.value) {
			return 'initializing';
		}

		try {
			const { testState } = await externalSecretsStore.testProviderConnection(
				provider.value.name,
				normalizedProviderData.value,
			);
			setConnectionState(testState);

			return testState;
		} catch (error) {
			setConnectionState('error');

			if (options.showError) {
				toast.showError(error, 'Error', error.response?.data?.data.error);
			}

			return 'error';
		} finally {
			if (provider.value.connected && ['connected', 'error'].includes(connectionState.value)) {
				externalSecretsStore.updateStoredProvider(provider.value.name, {
					state: connectionState.value,
				});
			}
		}
	}

	return {
		initialConnectionState,
		connectionState,
		normalizedProviderData,
		testConnection,
		setConnectionState,
		shouldDisplayProperty,
	};
}
