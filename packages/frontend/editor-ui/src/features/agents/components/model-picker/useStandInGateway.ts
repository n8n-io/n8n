import type { AiGatewayConfigDto } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { watch, type Ref } from 'vue';

import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

import { setGatewayUsesCatalog } from '../../composables/useModelCatalog';
import { getProviderCredentialTypes } from '../../model-providers';
import { STAND_IN_GATEWAY_PROVIDERS } from './fakeModelCatalog';

/**
 * ponytail: prototype-only. A local n8n has no AI gateway service, so the shipped
 * model selector shows no "Gateway credits" badges there. While the "Current
 * picker" scenario is on, this stands in for the gateway: the providers the live
 * gateway serves and a credit balance, so the current design shows as it does in
 * the product. A real gateway, when one is set up, is left alone.
 */
const STAND_IN_BALANCE = 1.48;

function standInConfig(): AiGatewayConfigDto {
	const credentialTypes = STAND_IN_GATEWAY_PROVIDERS.map(
		(provider) => getProviderCredentialTypes(provider)[0],
	);
	return {
		nodes: [],
		credentialTypes,
		providerConfig: Object.fromEntries(
			credentialTypes.map((credentialType, index) => [
				credentialType,
				{
					gatewayPath: `/v1/gateway/${STAND_IN_GATEWAY_PROVIDERS[index]}`,
					urlField: 'url',
					apiKeyField: 'apiKey',
				},
			]),
		),
	};
}

export function useStandInGateway(active: Ref<boolean>) {
	const settingsStore = useSettingsStore();
	const gatewayStore = useAiGatewayStore();
	let saved: {
		aiGateway: (typeof settingsStore.settings)['aiGateway'];
		config: AiGatewayConfigDto | null;
		balance: number | undefined;
		hasEverToppedUp: boolean | undefined;
	} | null = null;

	watch(
		active,
		(on) => {
			if (on && !saved && !settingsStore.isAiGatewayEnabled) {
				saved = {
					aiGateway: settingsStore.settings.aiGateway,
					config: gatewayStore.config,
					balance: gatewayStore.balance,
					hasEverToppedUp: gatewayStore.hasEverToppedUp,
				};
				settingsStore.settings.aiGateway = {
					budget: 0,
					cloudUbbEnabled: false,
					...settingsStore.settings.aiGateway,
					enabled: true,
				};
				gatewayStore.config = standInConfig();
				gatewayStore.balance = STAND_IN_BALANCE;
				// A topped-up wallet shows "Gateway credits" rather than "Free credits".
				gatewayStore.hasEverToppedUp = true;
				// The gateway cannot be asked for its models, so the catalog's are listed.
				setGatewayUsesCatalog(true);
				return;
			}
			if (!on && saved) {
				settingsStore.settings.aiGateway = saved.aiGateway;
				gatewayStore.config = saved.config;
				gatewayStore.balance = saved.balance;
				gatewayStore.hasEverToppedUp = saved.hasEverToppedUp;
				setGatewayUsesCatalog(false);
				saved = null;
			}
		},
		{ immediate: true },
	);
}
