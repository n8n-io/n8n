<script lang="ts" setup>
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useSSOStore, SupportedProtocols, type SupportedProtocolType } from '../sso.store';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext } from 'vue-router';
import { ElDialog } from 'element-plus';

import {
	N8nActionBox,
	N8nButton,
	N8nHeading,
	N8nInfoTip,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import SamlSettingsForm from '../components/SamlSettingsForm.vue';
import OidcSettingsForm from '../components/OidcSettingsForm.vue';

const i18n = useI18n();
const ssoStore = useSSOStore();
const documentTitle = useDocumentTitle();
const pageRedirectionHelper = usePageRedirectionHelper();

const samlFormRef = useTemplateRef<InstanceType<typeof SamlSettingsForm>>('samlForm');
const oidcFormRef = useTemplateRef<InstanceType<typeof OidcSettingsForm>>('oidcForm');

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

const activeForm = computed(() => {
	if (authProtocol.value === SupportedProtocols.SAML) return samlFormRef.value;
	if (authProtocol.value === SupportedProtocols.OIDC) return oidcFormRef.value;
	return null;
});

const authProtocol = ref<SupportedProtocolType>(SupportedProtocols.SAML);
function onAuthProtocolUpdated(value: SupportedProtocolType) {
	authProtocol.value = value;
}

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('sso', 'upgrade-sso');
};

onBeforeRouteLeave((_to, _from, next) => {
	if (!activeForm.value?.hasUnsavedChanges) {
		next();
		return;
	}

	pendingNext.value = next;
	showUnsavedChangesDialog.value = true;
});

async function onSaveAndLeave() {
	showUnsavedChangesDialog.value = false;
	await activeForm.value?.onSave();
	pendingNext.value?.();
	pendingNext.value = null;
}

function onLeaveWithoutSaving() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.();
	pendingNext.value = null;
}

function onKeepEditing() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.(false);
	pendingNext.value = null;
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
		<div v-if="hasAnySsoEnabled" data-test-id="sso-auth-protocol-select" :class="shared.group">
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
		<div
			v-if="ssoStore.isEnterpriseSamlEnabled && authProtocol === SupportedProtocols.SAML"
			data-test-id="sso-content-licensed"
		>
			<SamlSettingsForm ref="samlForm" />
		</div>
		<div
			v-if="ssoStore.isEnterpriseOidcEnabled && authProtocol === SupportedProtocols.OIDC"
			data-test-id="sso-content-licensed"
		>
			<OidcSettingsForm ref="oidcForm" />
		</div>
		<N8nActionBox
			v-if="!hasAnySsoEnabled"
			data-test-id="sso-content-unlicensed"
			:class="$style.actionBox"
			:description="i18n.baseText('settings.sso.actionBox.description')"
			:button-text="i18n.baseText('settings.sso.actionBox.buttonText')"
			@click:button="goToUpgrade"
		>
			<template #heading>
				<span>{{ i18n.baseText('settings.sso.actionBox.title') }}</span>
			</template>
		</N8nActionBox>

		<ElDialog
			v-model="showUnsavedChangesDialog"
			:title="i18n.baseText('settings.sso.settings.unsavedChanges.title')"
			width="500"
			data-test-id="sso-unsaved-changes-dialog"
		>
			<N8nText>{{ i18n.baseText('settings.sso.settings.unsavedChanges.message') }}</N8nText>
			<template #footer>
				<div :class="$style.dialogFooter">
					<N8nButton variant="ghost" data-test-id="sso-unsaved-keep-editing" @click="onKeepEditing">
						{{ i18n.baseText('settings.sso.settings.unsavedChanges.keepEditing') }}
					</N8nButton>
					<N8nButton
						variant="outline"
						data-test-id="sso-unsaved-leave"
						@click="onLeaveWithoutSaving"
					>
						{{ i18n.baseText('settings.sso.settings.unsavedChanges.leaveWithoutSaving') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						data-test-id="sso-unsaved-save-and-leave"
						@click="onSaveAndLeave"
					>
						{{ i18n.baseText('settings.sso.settings.unsavedChanges.saveAndLeave') }}
					</N8nButton>
				</div>
			</template>
		</ElDialog>
	</div>
</template>

<style lang="scss" module="shared" src="../styles/sso-form.module.scss" />

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--sm);
}

.actionBox {
	margin-top: var(--spacing--lg);
}

.dialogFooter {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}
</style>
