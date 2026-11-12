<script lang="ts" setup>
import { N8nSettingsLayout, N8nSettingsPageHeader } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { VIEWS } from '@/app/constants';

import ScimProvisioningSection from '../components/ScimProvisioningSection.vue';
import { useSSOStore } from '../sso.store';

const i18n = useI18n();
const router = useRouter();
const ssoStore = useSSOStore();
const documentTitle = useDocumentTitle();

const isSsoLoginEnabled = computed(
	() => ssoStore.isSamlLoginEnabled || ssoStore.isOidcLoginEnabled,
);

async function goBack() {
	await router.push({ name: VIEWS.SSO_SETTINGS });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.sso.scim.title'));
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		show-back
		:back-label="i18n.baseText('settings.sso.scim.back')"
		data-test-id="settings-scim-view"
		@back="goBack"
	>
		<!-- No public SCIM guide exists yet (DOC-2433), so the page has no docs link. -->
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.sso.scim.title')"
			:description="i18n.baseText('settings.sso.scim.description')"
			:show-docs-link="false"
		/>
		<ScimProvisioningSection :sso-enabled="isSsoLoginEnabled" />
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
