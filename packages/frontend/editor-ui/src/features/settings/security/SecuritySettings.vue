<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { I18nT } from 'vue-i18n';
import {
	N8nAlertDialog,
	N8nBadge,
	N8nNotice,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { RedactionFloor } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { EnterpriseEditionFeature, SECURITY_POLICIES_DOCS_URL } from '@/app/constants';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import DataRedactionSection from './DataRedactionSection.vue';
import WorkflowReviewsSection from './WorkflowReviewsSection.vue';
import { useWorkflowReviewsFeature } from '@/features/workflow-reviews/composables/useWorkflowReviewsFeature';

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const pageRedirectionHelper = usePageRedirectionHelper();
const { isWorkflowReviewsAvailable } = useWorkflowReviewsFeature();

const mfaTooltipKey = 'settings.personal.mfa.enforce.unlicensed_tooltip';
const personalSpaceTooltipKey = 'settings.security.personalSpace.unlicensed_tooltip';
const showPublishingDialog = ref(false);
const showSharingDialog = ref(false);

const isEnforceMFAEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.EnforceMFA],
);

const isPersonalSpacePolicyLicensed = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.PersonalSpacePolicy],
);

async function onUpdateMfaEnforced(value: string | number | boolean) {
	const boolValue = typeof value === 'boolean' ? value : Boolean(value);
	try {
		await usersStore.updateEnforceMfa(boolValue);
		showToast({
			type: 'success',
			title: boolValue
				? i18n.baseText('settings.personal.mfa.enforce.enabled.title')
				: i18n.baseText('settings.personal.mfa.enforce.disabled.title'),
			message: boolValue
				? i18n.baseText('settings.personal.mfa.enforce.enabled.message')
				: i18n.baseText('settings.personal.mfa.enforce.disabled.message'),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.personal.mfa.enforce.error'));
	}
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('settings-users', 'upgrade-users');
}

const { state, isReady, error } = useAsyncState(async () => {
	const settings = await securitySettingsApi.getSecuritySettings(rootStore.restApiContext);
	return {
		personalSpacePublishing: settings.personalSpacePublishing,
		personalSpaceSharing: settings.personalSpaceSharing,
		publishedPersonalWorkflowsCount: settings.publishedPersonalWorkflowsCount,
		sharedPersonalWorkflowsCount: settings.sharedPersonalWorkflowsCount,
		sharedPersonalCredentialsCount: settings.sharedPersonalCredentialsCount,
		managedByEnv: settings.managedByEnv,
		initialRedactionFloor: (settings.redactionEnforcement?.floor ?? 'off') as RedactionFloor,
		workflowReviewsEnabled: settings.workflowReviews?.enabled ?? false,
	};
}, undefined);

const isManagedByEnv = computed(() => state.value?.managedByEnv ?? false);

// The security settings endpoint is gated by an enterprise license and 403s on
// unlicensed instances, leaving `state` undefined. The data redaction section
// still needs to render so the licensed-feature upgrade prompt is reachable, so
// we render once the request settles (resolved or failed) rather than waiting
// for a defined `state`.
const isSecuritySettingsSettled = computed(() => isReady.value || error.value !== undefined);

async function updatePersonalSpaceSetting(
	key: 'personalSpacePublishing' | 'personalSpaceSharing',
	value: boolean,
	toastNamespace: string,
) {
	try {
		await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			[key]: value,
		});
		showToast({
			type: 'success',
			title: value
				? i18n.baseText(
						`settings.security.personalSpace.${toastNamespace}.success.enabled` as BaseTextKey,
					)
				: i18n.baseText(
						`settings.security.personalSpace.${toastNamespace}.success.disabled` as BaseTextKey,
					),
			message: '',
		});
	} catch (error) {
		if (state.value) {
			state.value = { ...state.value, [key]: !value };
		}
		showError(
			error,
			i18n.baseText(`settings.security.personalSpace.${toastNamespace}.error` as BaseTextKey),
		);
	}
}

const personalSpacePublishing = computed({
	get: () => state.value?.personalSpacePublishing ?? false,
	set: (value: boolean) => {
		if (!value) {
			showPublishingDialog.value = true;
			return;
		}
		if (state.value) {
			state.value = { ...state.value, personalSpacePublishing: value };
		}
		void updatePersonalSpaceSetting('personalSpacePublishing', value, 'publishing');
	},
});

function confirmDisablePublishing() {
	showPublishingDialog.value = false;
	if (state.value) {
		state.value = { ...state.value, personalSpacePublishing: false };
	}
	void updatePersonalSpaceSetting('personalSpacePublishing', false, 'publishing');
}

const personalSpaceSharing = computed({
	get: () => state.value?.personalSpaceSharing ?? false,
	set: (value: boolean) => {
		if (!value) {
			showSharingDialog.value = true;
			return;
		}
		if (state.value) {
			state.value = { ...state.value, personalSpaceSharing: value };
		}
		void updatePersonalSpaceSetting('personalSpaceSharing', value, 'sharing');
	},
});

function confirmDisableSharing() {
	showSharingDialog.value = false;
	if (state.value) {
		state.value = { ...state.value, personalSpaceSharing: false };
	}
	void updatePersonalSpaceSetting('personalSpaceSharing', false, 'sharing');
}

const sharingCountText = computed(() => {
	const workflows = state.value?.sharedPersonalWorkflowsCount ?? 0;
	const credentials = state.value?.sharedPersonalCredentialsCount ?? 0;
	return i18n.baseText('settings.security.personalSpace.sharing.existingCount.value', {
		interpolate: {
			workflowCount: String(workflows),
			credentialCount: String(credentials),
		},
	});
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.security')"
			:description="i18n.baseText('settings.security.description')"
			:docs-url="SECURITY_POLICIES_DOCS_URL"
			data-test-id="security-settings-header"
		/>

		<N8nNotice
			v-if="isManagedByEnv"
			:content="i18n.baseText('settings.security.managedByEnv')"
			data-test-id="security-managed-by-env-notice"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.personal.mfa.enforce.message')"
			data-test-id="security-mfa-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow>
					<template #info>
						<N8nText :bold="true">
							{{ i18n.baseText('settings.personal.mfa.enforce.title') }}
							<N8nBadge v-if="!isEnforceMFAEnabled" class="ml-4xs">
								{{ i18n.baseText('generic.upgrade') }}
							</N8nBadge>
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.personal.mfa.enforce.description') }}
						</N8nText>
					</template>
					<template #action>
						<EnterpriseEdition :features="[EnterpriseEditionFeature.EnforceMFA]">
							<ElSwitch
								:model-value="settingsStore.isMFAEnforced"
								size="large"
								:disabled="isManagedByEnv"
								data-test-id="enable-force-mfa"
								@update:model-value="onUpdateMfaEnforced"
							/>
							<template #fallback>
								<N8nTooltip>
									<ElSwitch
										:model-value="settingsStore.isMFAEnforced"
										size="large"
										:disabled="true"
									/>
									<template #content>
										<I18nT :keypath="mfaTooltipKey" tag="span" scope="global">
											<template #action>
												<a @click="goToUpgrade">
													{{
														i18n.baseText('settings.personal.mfa.enforce.unlicensed_tooltip.link')
													}}
												</a>
											</template>
										</I18nT>
									</template>
								</N8nTooltip>
							</template>
						</EnterpriseEdition>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<DataRedactionSection
			v-if="isSecuritySettingsSettled"
			:initial-floor="state?.initialRedactionFloor ?? 'off'"
			:managed-by-env="isManagedByEnv"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.security.personalSpace.title')"
			data-test-id="security-personal-space-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow>
					<template #info>
						<N8nText :bold="true">
							{{ i18n.baseText('settings.security.personalSpace.sharing.title') }}
							<N8nBadge v-if="!isPersonalSpacePolicyLicensed" class="ml-4xs">
								{{ i18n.baseText('generic.upgrade') }}
							</N8nBadge>
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.security.personalSpace.sharing.description') }}
						</N8nText>
					</template>
					<template #action>
						<EnterpriseEdition :features="[EnterpriseEditionFeature.PersonalSpacePolicy]">
							<ElSwitch
								v-if="state !== undefined"
								v-model="personalSpaceSharing"
								size="large"
								:disabled="isManagedByEnv"
								data-test-id="security-personal-space-sharing-toggle"
							/>
							<template #fallback>
								<N8nTooltip>
									<ElSwitch
										v-if="state !== undefined"
										:model-value="personalSpaceSharing"
										size="large"
										:disabled="true"
										data-test-id="security-personal-space-sharing-toggle"
									/>
									<template #content>
										<I18nT :keypath="personalSpaceTooltipKey" tag="span" scope="global">
											<template #action>
												<a @click="goToUpgrade">
													{{
														i18n.baseText('settings.security.personalSpace.unlicensed_tooltip.link')
													}}
												</a>
											</template>
										</I18nT>
									</template>
								</N8nTooltip>
							</template>
						</EnterpriseEdition>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('settings.security.personalSpace.sharing.existingCount.label')"
					data-test-id="security-sharing-count"
				>
					<template #action>
						<N8nText size="small" color="text-light">
							{{ sharingCountText }}
						</N8nText>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<N8nSettingsRowGroup>
				<N8nSettingsRow>
					<template #info>
						<N8nText :bold="true">
							{{ i18n.baseText('settings.security.personalSpace.publishing.title') }}
							<N8nBadge v-if="!isPersonalSpacePolicyLicensed" class="ml-4xs">
								{{ i18n.baseText('generic.upgrade') }}
							</N8nBadge>
						</N8nText>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('settings.security.personalSpace.publishing.description') }}
						</N8nText>
					</template>
					<template #action>
						<EnterpriseEdition :features="[EnterpriseEditionFeature.PersonalSpacePolicy]">
							<ElSwitch
								v-if="state !== undefined"
								v-model="personalSpacePublishing"
								size="large"
								:disabled="isManagedByEnv"
								data-test-id="security-personal-space-publishing-toggle"
							/>
							<template #fallback>
								<N8nTooltip>
									<ElSwitch
										v-if="state !== undefined"
										:model-value="personalSpacePublishing"
										size="large"
										:disabled="true"
										data-test-id="security-personal-space-publishing-toggle"
									/>
									<template #content>
										<I18nT :keypath="personalSpaceTooltipKey" tag="span" scope="global">
											<template #action>
												<a @click="goToUpgrade">
													{{
														i18n.baseText('settings.security.personalSpace.unlicensed_tooltip.link')
													}}
												</a>
											</template>
										</I18nT>
									</template>
								</N8nTooltip>
							</template>
						</EnterpriseEdition>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('settings.security.personalSpace.publishing.existingCount.label')"
					data-test-id="security-publishing-count"
				>
					<template #action>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('settings.security.personalSpace.publishing.existingCount.value', {
									interpolate: {
										count: String(state?.publishedPersonalWorkflowsCount ?? 0),
									},
								})
							}}
						</N8nText>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-if="isSecuritySettingsSettled && isWorkflowReviewsAvailable && state !== undefined"
			:title="i18n.baseText('settings.security.workflowReviews.title')"
			data-test-id="security-workflow-reviews-section"
		>
			<N8nSettingsRowGroup>
				<WorkflowReviewsSection
					:initial-enabled="state.workflowReviewsEnabled"
					:managed-by-env="isManagedByEnv"
				/>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nAlertDialog
			:open="showPublishingDialog"
			:title="
				i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.headline')
			"
			:description="
				i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.message')
			"
			@action="confirmDisablePublishing"
			@cancel="showPublishingDialog = false"
			@update:open="showPublishingDialog = $event"
		/>

		<N8nAlertDialog
			:open="showSharingDialog"
			:title="
				i18n.baseText('settings.security.personalSpace.sharing.confirmMessage.disable.headline')
			"
			:description="
				i18n.baseText('settings.security.personalSpace.sharing.confirmMessage.disable.message')
			"
			size="medium"
			@action="confirmDisableSharing"
			@cancel="showSharingDialog = false"
			@update:open="showSharingDialog = $event"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.layout {
	padding-top: 0;
}
</style>
