<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import { N8nHeading, N8nInfoTip, N8nOption, N8nSelect } from '@n8n/design-system';
import SamlSettingsForm from '../components/SamlSettingsForm.vue';
import OidcSettingsForm from '../components/OidcSettingsForm.vue';

const i18n = useI18n();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const ssoStore = useSSOStore();
const documentTitle = useDocumentTitle();

const options = computed(() => {
	return [
		{
			label: SupportedProtocols.SAML.toUpperCase(),
			value: SupportedProtocols.SAML,
		},
		{
			label: ssoStore.isEnterpriseOidcEnabled
				? SupportedProtocols.OIDC.toUpperCase()
				: `${SupportedProtocols.OIDC.toUpperCase()} (${i18n.baseText('generic.upgradeToEnterprise')})`,
			value: SupportedProtocols.OIDC,
		},
	];
});

const authProtocol = ref<SupportedProtocolType>(SupportedProtocols.SAML);
function onAuthProtocolUpdated(value: SupportedProtocolType) {
	authProtocol.value = value;
}

const trackUpdateSettings = () => {
	const trackingMetadata: {
		instance_id: string;
		authentication_method: SupportedProtocolType;
		is_active?: boolean;
		discovery_endpoint?: string;
		identity_provider?: 'metadata' | 'xml';
	} = {
		instance_id: rootStore.instanceId,
		authentication_method: authProtocol.value,
	};

	// TODO: consider getting this data from emit of child component rather than store
	if (authProtocol.value === SupportedProtocols.SAML) {
		trackingMetadata.identity_provider = ssoStore.samlConfig?.metadataUrl ? 'metadata' : 'xml';
		trackingMetadata.is_active = ssoStore.isSamlLoginEnabled;
	} else if (authProtocol.value === SupportedProtocols.OIDC) {
		trackingMetadata.discovery_endpoint = ssoStore.oidcConfig?.discoveryEndpoint;
		trackingMetadata.is_active = ssoStore.isOidcLoginEnabled;
	}
	telemetry.track('User updated single sign on settings', trackingMetadata);
};

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.sso.title'));
	ssoStore.initializeSelectedProtocol();
	authProtocol.value = ssoStore.selectedAuthProtocol || SupportedProtocols.SAML;
});
</script>

<template>
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.sso.title') }}</N8nHeading>
		</div>
		<N8nInfoTip>
			{{ i18n.baseText('settings.sso.info') }}
			<a href="https://docs.n8n.io/user-management/saml/" target="_blank">
				{{ i18n.baseText('settings.sso.info.link') }}
			</a>
		</N8nInfoTip>
		<div
			v-if="ssoStore.isEnterpriseSamlEnabled || ssoStore.isEnterpriseOidcEnabled"
			data-test-id="sso-auth-protocol-select"
			:class="$style.group"
		>
			<label>Select Authentication Protocol</label>
			<div>
				<N8nSelect
					filterable
					:model-value="authProtocol"
					:placeholder="i18n.baseText('parameterInput.select')"
					@update:model-value="onAuthProtocolUpdated"
					@keydown.stop
				>
					<N8nOption
						v-for="{ label, value } in options"
						:key="value"
						:value="value"
						:label="label"
						data-test-id="credential-select-option"
					>
					</N8nOption>
				</N8nSelect>
			</div>
		</div>
		<div v-if="authProtocol === SupportedProtocols.SAML">
			<SamlSettingsForm @submit-success="trackUpdateSettings" />
		</div>
		<div v-if="authProtocol === SupportedProtocols.OIDC">
			<OidcSettingsForm @submit-success="trackUpdateSettings" />
		</div>
	</div>
	<!-- TODO: display user role provisioning modal based on userRoleProvisioningStore -->
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}

.switch {
	span {
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--bold);
		color: var(--color--text--tint-1);
	}
}

.buttons {
	display: flex;
	justify-content: flex-start;
	padding: var(--spacing--2xl) 0 var(--spacing--2xs);

	button {
		margin: 0 var(--spacing--sm) 0 0;
	}
}

.group {
	padding: var(--spacing--xl) 0 0;

	> label {
		display: inline-block;
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		padding: 0 0 var(--spacing--2xs);
	}

	small {
		display: block;
		padding: var(--spacing--2xs) 0 0;
		font-size: var(--font-size--2xs);
		color: var(--color--text);
	}
}

.actionBox {
	margin: var(--spacing--2xl) 0 0;
}

.footer {
	color: var(--color--text);
	font-size: var(--font-size--2xs);
}
</style>
