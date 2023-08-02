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
	const connectionState = ref<ExternalSecretsProviderWithProperties['state']>();

	const normalizedProviderData = computed(() => {
		return Object.entries(providerData.value).reduce((acc, [key, value]) => {
			const property = provider.value?.properties?.find((property) => property.name === key);
			if (shouldDisplayProperty(property)) {
				acc[key] = value;
			}

			return acc;
		}, {} as Record<string, IUpdateInformation['value']>);
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
			connectionState.value = testState;
			return testState;
		} catch (error) {
			connectionState.value = 'error';

			if (options.showError) {
				toast.showError(error, 'Error', error.response?.data?.data.error);
			}

			return 'error';
		}
	}

	return {
		initialConnectionState,
		connectionState,
		normalizedProviderData,
		testConnection,
		shouldDisplayProperty,
	};
}
