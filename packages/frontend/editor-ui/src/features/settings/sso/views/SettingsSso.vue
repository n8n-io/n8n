<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { onBeforeRouteLeave, useRouter, type NavigationGuardNext } from 'vue-router';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nEmptyState,
	N8nCallout,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsSaveBar,
	N8nText,
} from '@n8n/design-system';
import { VIEWS } from '@/app/constants';
import SamlSettingsForm from '../components/SamlSettingsForm.vue';
import OidcSettingsForm from '../components/OidcSettingsForm.vue';
import ScimProvisioningSection from '../components/ScimProvisioningSection.vue';
import { useUserRoleProvisioningStore } from '../provisioning/composables/userRoleProvisioning.store';

const i18n = useI18n();
const router = useRouter();
const ssoStore = useSSOStore();
const settingsStore = useSettingsStore();
const rbacStore = useRBACStore();
const provisioningStore = useUserRoleProvisioningStore();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const isRulesMappingInN8n = computed(
	() => provisioningStore.provisioningConfig?.scopesUseExpressionMapping ?? false,
);

const samlFormRef = useTemplateRef<InstanceType<typeof SamlSettingsForm>>('samlForm');
const oidcFormRef = useTemplateRef<InstanceType<typeof OidcSettingsForm>>('oidcForm');
const scimSectionRef = useTemplateRef<InstanceType<typeof ScimProvisioningSection>>('scimSection');

const showUnsavedChangesDialog = ref(false);
const pendingNext = ref<NavigationGuardNext | null>(null);

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

const hasAnySsoEnabled = computed(
	() => ssoStore.isEnterpriseSamlEnabled || ssoStore.isEnterpriseOidcEnabled,
);

/**
 * SCIM needs the `feat:scim` license, the pre-GA opt-in `N8N_ENV_FEAT_SCIM`
 * and the `scim:manage` scope. The backend accepts only `'true'` for the
 * opt-in, so the page does not use the looser `useEnvFeatureFlag` check.
 */
const showScimSection = computed(
	() =>
		settingsStore.isModuleActive('scim') &&
		settingsStore.settings.envFeatureFlags?.N8N_ENV_FEAT_SCIM === 'true' &&
		rbacStore.hasScope('scim:manage'),
);

const isSsoLoginEnabled = computed(
	() => ssoStore.isSamlLoginEnabled || ssoStore.isOidcLoginEnabled,
);

async function goToAuthentication() {
	await router.push({ name: VIEWS.AUTHENTICATION_SETTINGS });
}

const activeForm = computed(() => {
	if (authProtocol.value === SupportedProtocols.SAML) return samlFormRef.value;
	if (authProtocol.value === SupportedProtocols.OIDC) return oidcFormRef.value;
	return null;
});

const authProtocol = ref<SupportedProtocolType>(SupportedProtocols.SAML);

/** A new key remounts the form, which loads the saved values again. */
const formKey = ref(0);

const hasUnsavedChanges = computed(
	() =>
		Boolean(activeForm.value?.hasUnsavedChanges) ||
		Boolean(scimSectionRef.value?.hasUnsavedChanges),
);

const isSaving = computed(
	() => Boolean(activeForm.value?.saving) || Boolean(scimSectionRef.value?.saving),
);

/**
 * One save for the SSO form and SCIM. SSO goes first, because the backend
 * accepts SCIM only while SAML or OIDC login is on.
 */
async function saveAll(): Promise<boolean> {
	if (activeForm.value?.hasUnsavedChanges) {
		const saved = await activeForm.value.onSave();
		if (!saved) return false;
	}
	const scimSection = scimSectionRef.value;
	if (!scimSection) return true;
	// Turning SSO off also turns SCIM off on the backend. Drop the pending SCIM
	// change, which the backend would reject, and show the saved state.
	if (!isSsoLoginEnabled.value) {
		await scimSection.reload();
		return true;
	}
	return scimSection.hasUnsavedChanges ? await scimSection.save() : true;
}

async function onSaveBarSave() {
	await saveAll();
}

function onDiscardChanges() {
	if (activeForm.value?.hasUnsavedChanges) {
		// The OIDC login switch writes to the store, so put the saved value back first.
		if (authProtocol.value === SupportedProtocols.OIDC) {
			ssoStore.isOidcLoginEnabled = ssoStore.oidcConfig?.loginEnabled ?? false;
		}
		formKey.value++;
	}
	scimSectionRef.value?.discard();
}

function onAuthProtocolUpdated(value: SupportedProtocolType) {
	authProtocol.value = value;
}

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

onBeforeRouteLeave((_to, _from, next) => {
	if (!hasUnsavedChanges.value) {
		next();
		return;
	}

	pendingNext.value = next;
	showUnsavedChangesDialog.value = true;
});

async function onSaveAndLeave() {
	const next = pendingNext.value;
	pendingNext.value = null;
	showUnsavedChangesDialog.value = false;
	const saved = await saveAll();
	if (saved) {
		next?.();
	} else {
		next?.(false);
	}
}

function onLeaveWithoutSaving() {
	const next = pendingNext.value;
	pendingNext.value = null;
	showUnsavedChangesDialog.value = false;
	next?.();
}

function onDismissUnsavedChanges() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.(false);
	pendingNext.value = null;
}

function onUnsavedDialogOpenUpdate(open: boolean) {
	if (!open) onDismissUnsavedChanges();
}

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.sso.title'));
	ssoStore.initializeSelectedProtocol();
	authProtocol.value = ssoStore.selectedAuthProtocol || SupportedProtocols.SAML;
});
</script>

<template>
	<!-- Full width: the role mapping rules need the room for their expressions. -->
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.authentication.back')"
		data-test-id="sso-settings-view"
		@back="goToAuthentication"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.sso.title')"
			:description="i18n.baseText('settings.sso.info')"
			docs-url="https://docs.n8n.io/user-management/saml/"
			:class="$style.header"
			data-test-id="sso-settings-header"
		/>
		<N8nCallout v-if="ssoStore.ssoManagedByEnv" theme="warning">
			{{
				isRulesMappingInN8n
					? i18n.baseText('settings.sso.settings.envConfigBannerWithRules')
					: i18n.baseText('settings.sso.settings.envConfigBanner')
			}}
		</N8nCallout>
		<!-- One wrapper keeps the protocol card joined to the form: the layout spaces its direct children. -->
		<div v-if="hasAnySsoEnabled">
			<!-- Protocol selector — rendered independently outside form v-ifs for E2E timing -->
			<div :class="[shared.card, $style.protocolCard]">
				<div data-test-id="sso-auth-protocol-select" :class="shared.settingsItem">
					<div :class="shared.settingsItemLabel">
						<label>{{ i18n.baseText('settings.sso.settings.authProtocol.label') }}</label>
						<small>{{ i18n.baseText('settings.sso.settings.authProtocol.description') }}</small>
					</div>
					<div :class="shared.settingsItemControl">
						<N8nSelect
							filterable
							size="medium"
							:disabled="ssoStore.ssoManagedByEnv"
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
							/>
						</N8nSelect>
					</div>
				</div>
			</div>
			<div
				v-if="ssoStore.isEnterpriseSamlEnabled && authProtocol === SupportedProtocols.SAML"
				data-test-id="sso-content-licensed"
			>
				<SamlSettingsForm ref="samlForm" :key="formKey" />
			</div>
			<div
				v-if="ssoStore.isEnterpriseOidcEnabled && authProtocol === SupportedProtocols.OIDC"
				data-test-id="sso-content-licensed"
			>
				<OidcSettingsForm ref="oidcForm" :key="formKey" />
			</div>
		</div>
		<N8nEmptyState
			v-else
			data-test-id="sso-content-unlicensed"
			:description="i18n.baseText('settings.sso.actionBox.description')"
			:button-text="i18n.baseText('settings.sso.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
			</template>
		</N8nEmptyState>

		<ScimProvisioningSection
			v-if="showScimSection"
			ref="scimSection"
			:sso-enabled="isSsoLoginEnabled"
		/>

		<N8nDialog
			:open="showUnsavedChangesDialog"
			size="medium"
			:header="i18n.baseText('settings.sso.settings.unsavedChanges.title')"
			data-test-id="sso-unsaved-changes-dialog"
			@update:open="onUnsavedDialogOpenUpdate"
		>
			<N8nDialogBody>
				<N8nText>{{ i18n.baseText('settings.sso.settings.unsavedChanges.message') }}</N8nText>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton variant="outline" data-test-id="sso-unsaved-leave" @click="onLeaveWithoutSaving">
					{{ i18n.baseText('settings.sso.settings.unsavedChanges.leaveWithoutSaving') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					data-test-id="sso-unsaved-save-and-leave"
					@click="onSaveAndLeave"
				>
					{{ i18n.baseText('settings.sso.settings.unsavedChanges.saveAndLeave') }}
				</N8nButton>
			</N8nDialogFooter>
		</N8nDialog>

		<!-- The save bar must be the last child of the content column to dock at the page end. -->
		<N8nSettingsSaveBar
			floating
			:visible="hasUnsavedChanges || isSaving"
			:saving="isSaving"
			:message="i18n.baseText('settings.sso.settings.unsavedChanges.title')"
			:save-label="i18n.baseText('settings.sso.settings.save')"
			:discard-label="i18n.baseText('settings.sso.settings.discard')"
			@save="onSaveBarSave"
			@discard="onDiscardChanges"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module="shared" src="../styles/sso-form.module.scss" />

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}

/* On a full-width page the header lines up with the cards instead of a centered column. */
.layout .header {
	max-width: none;
	margin-inline: 0;
}

.protocolCard {
	margin-bottom: 0;
	padding-bottom: 0;
	border-bottom: none;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
}
</style>
