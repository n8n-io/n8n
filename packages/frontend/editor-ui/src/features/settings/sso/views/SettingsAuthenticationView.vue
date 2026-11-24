<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import {
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUserHelpers } from '@/app/composables/useUserHelpers';
import { AUTHENTICATION_DOCS_URL, VIEWS } from '@/app/constants';

import { useSSOStore } from '../sso.store';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const settingsStore = useSettingsStore();
const ssoStore = useSSOStore();
const { canUserAccessRouteByName } = useUserHelpers(router);

const canManageSso = computed(() => canUserAccessRouteByName(VIEWS.SSO_SETTINGS));
const canManageLdap = computed(() => canUserAccessRouteByName(VIEWS.LDAP_SETTINGS));
const canManagePolicies = computed(() => canUserAccessRouteByName(VIEWS.SECURITY_SETTINGS));

const activeLabel = i18n.baseText('settings.authentication.status.active');

// Only one method can be active at a time; the configure affordance keeps its default
// label for the others.
const ssoStatus = computed(() =>
	ssoStore.isSamlLoginEnabled || ssoStore.isOidcLoginEnabled ? activeLabel : undefined,
);
const ldapStatus = computed(() => (ssoStore.isLdapLoginEnabled ? activeLabel : undefined));
const mfaStatus = computed(() =>
	i18n.baseText(
		settingsStore.isMFAEnforced
			? 'settings.authentication.mfa.enforced'
			: 'settings.authentication.mfa.optional',
	),
);

async function openSso() {
	await router.push({ name: VIEWS.SSO_SETTINGS });
}

async function openLdap() {
	await router.push({ name: VIEWS.LDAP_SETTINGS });
}

async function openPolicies() {
	await router.push({ name: VIEWS.SECURITY_SETTINGS });
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.authentication'));
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" data-test-id="settings-authentication-view">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.authentication')"
			:description="i18n.baseText('settings.authentication.description')"
			:docs-url="AUTHENTICATION_DOCS_URL"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.authentication.methods.title')"
			data-test-id="settings-authentication-methods"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="canManageSso"
					clickable
					:title="i18n.baseText('settings.authentication.sso.title')"
					:description="i18n.baseText('settings.authentication.sso.description')"
					data-test-id="settings-authentication-sso-row"
					@click="openSso"
				>
					<template #action>
						<N8nSettingsRowConfigure :value="ssoStatus" />
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					v-if="canManageLdap"
					clickable
					:title="i18n.baseText('settings.ldap')"
					:description="i18n.baseText('settings.authentication.ldap.description')"
					data-test-id="settings-authentication-ldap-row"
					@click="openLdap"
				>
					<template #action>
						<N8nSettingsRowConfigure :value="ldapStatus" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-if="canManagePolicies"
			:title="i18n.baseText('settings.authentication.requirements.title')"
			data-test-id="settings-authentication-requirements"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					clickable
					:title="i18n.baseText('settings.authentication.mfa.title')"
					:description="i18n.baseText('settings.authentication.mfa.description')"
					data-test-id="settings-authentication-mfa-row"
					@click="openPolicies"
				>
					<template #action>
						<N8nSettingsRowConfigure :value="mfaStatus" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
