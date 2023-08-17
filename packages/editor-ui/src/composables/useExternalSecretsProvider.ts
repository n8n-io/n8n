import type {
	ExternalSecretsProviderWithProperties,
	ExternalSecretsProvider,
	IUpdateInformation,
	ExternalSecretsProviderData,
} from '@/Interface';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import { useExternalSecretsStore } from '@/stores/externalSecrets.ee.store';
import { useToast } from '@/composables/useToast';

export function useExternalSecretsProvider(
	provider: Ref<ExternalSecretsProvider>,
	providerData: Ref<ExternalSecretsProviderData>,
) {
	const toast = useToast();
	const externalSecretsStore = useExternalSecretsStore();

	const initialConnectionState = ref<ExternalSecretsProviderWithProperties['state'] | undefined>(
		'initializing',
	);
	const connectionState = computed(
		() => externalSecretsStore.connectionState[provider.value?.name],
	);
	const setConnectionState = (state: ExternalSecretsProviderWithProperties['state']) => {
		externalSecretsStore.setConnectionState(provider.value?.name, state);
	};

	const normalizedProviderData = computed(() => {
		return Object.entries(providerData.value).reduce(
			(acc, [key, value]) => {
				const property = provider.value?.properties?.find((property) => property.name === key);
				if (shouldDisplayProperty(property)) {
					acc[key] = value;
				}

				return acc;
			},
			{} as Record<string, IUpdateInformation['value']>,
		);
	});

	function shouldDisplayProperty(
		property: ExternalSecretsProviderWithProperties['properties'][0],
	): boolean {
		let visible = true;

		if (property.displayOptions?.show) {
			visible =
				visible &&
				Object.entries(property.displayOptions.show).every(([key, value]) => {
					return value?.includes(providerData.value[key]);
				});
		}

		if (property.displayOptions?.hide) {
			visible =
				visible &&
				!Object.entries(property.displayOptions.hide).every(([key, value]) => {
					return value?.includes(providerData.value[key]);
				});
		}

		return visible;
	}

	async function testConnection(options: { showError?: boolean } = { showError: true }) {
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
