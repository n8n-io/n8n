<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { N8nHeading, N8nInfoTip, N8nOption, N8nSelect } from '@n8n/design-system';
import SamlSettingsForm from '../components/SamlSettingsForm.vue';
import OidcSettingsForm from '../components/OidcSettingsForm.vue';

const i18n = useI18n();
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
			:class="shared.group"
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
			<SamlSettingsForm />
		</div>
		<div v-if="authProtocol === SupportedProtocols.OIDC">
			<OidcSettingsForm />
		</div>
	</div>
</template>

<style lang="scss" module="shared" src="../styles/sso-form.module.scss" />

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}
</style>
