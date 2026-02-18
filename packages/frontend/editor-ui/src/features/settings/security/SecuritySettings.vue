<script lang="ts" setup>
import { computed, ref, useCssModule } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { I18nT } from 'vue-i18n';
import { N8nAlertDialog, N8nBadge, N8nHeading, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { EnterpriseEditionFeature } from '@/app/constants';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';

const $style = useCssModule();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const pageRedirectionHelper = usePageRedirectionHelper();

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

const { state, isLoading } = useAsyncState(async () => {
	const settings = await securitySettingsApi.getSecuritySettings(rootStore.restApiContext);
	return {
		personalSpacePublishing: settings.personalSpacePublishing,
		personalSpaceSharing: settings.personalSpaceSharing,
		publishedPersonalWorkflowsCount: settings.publishedPersonalWorkflowsCount,
		sharedPersonalWorkflowsCount: settings.sharedPersonalWorkflowsCount,
		sharedPersonalCredentialsCount: settings.sharedPersonalCredentialsCount,
	};
}, undefined);

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
	<div class="pb-3xl">
		<div class="mb-xl" :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.security') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.security.description') }}
			</N8nText>
		</div>

		<N8nHeading tag="h2" size="large" class="mb-l">
			{{ i18n.baseText('settings.personal.mfa.enforce.title') }}
		</N8nHeading>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true"
						>{{ i18n.baseText('settings.personal.mfa.enforce.title') }}
						<N8nBadge v-if="!isEnforceMFAEnabled" class="ml-4xs">{{
							i18n.baseText('generic.upgrade')
						}}</N8nBadge>
					</N8nText>
					<N8nText size="small" color="text-light">{{
						i18n.baseText('settings.personal.mfa.enforce.message')
					}}</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<EnterpriseEdition :features="[EnterpriseEditionFeature.EnforceMFA]">
						<ElSwitch
							:model-value="settingsStore.isMFAEnforced"
							size="large"
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
												{{ i18n.baseText('settings.personal.mfa.enforce.unlicensed_tooltip.link') }}
											</a>
										</template>
									</I18nT>
								</template>
							</N8nTooltip>
						</template>
					</EnterpriseEdition>
				</div>
			</div>
		</div>

		<N8nHeading tag="h2" size="large" class="mb-l">
			{{ i18n.baseText('settings.security.personalSpace.title') }}
		</N8nHeading>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true"
						>{{ i18n.baseText('settings.security.personalSpace.sharing.title') }}
						<N8nBadge v-if="!isPersonalSpacePolicyLicensed" class="ml-4xs">{{
							i18n.baseText('generic.upgrade')
						}}</N8nBadge>
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.personalSpace.sharing.description') }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<EnterpriseEdition :features="[EnterpriseEditionFeature.PersonalSpacePolicy]">
						<ElSwitch
							v-model="personalSpaceSharing"
							:loading="isLoading"
							size="large"
							data-test-id="security-personal-space-sharing-toggle"
						/>
						<template #fallback>
							<N8nTooltip>
								<ElSwitch
									:model-value="false"
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
				</div>
			</div>
			<div :class="$style.settingsCountRow" data-test-id="security-sharing-count">
				<N8nText size="small">
					{{ i18n.baseText('settings.security.personalSpace.sharing.existingCount.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ sharingCountText }}
				</N8nText>
			</div>
		</div>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true"
						>{{ i18n.baseText('settings.security.personalSpace.publishing.title') }}
						<N8nBadge v-if="!isPersonalSpacePolicyLicensed" class="ml-4xs">{{
							i18n.baseText('generic.upgrade')
						}}</N8nBadge>
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.personalSpace.publishing.description') }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<EnterpriseEdition :features="[EnterpriseEditionFeature.PersonalSpacePolicy]">
						<ElSwitch
							v-model="personalSpacePublishing"
							:loading="isLoading"
							size="large"
							data-test-id="security-personal-space-publishing-toggle"
						/>
						<template #fallback>
							<N8nTooltip>
								<ElSwitch
									:model-value="false"
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
				</div>
			</div>
			<div :class="$style.settingsCountRow" data-test-id="security-publishing-count">
				<N8nText size="small">
					{{ i18n.baseText('settings.security.personalSpace.publishing.existingCount.label') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('settings.security.personalSpace.publishing.existingCount.value', {
							interpolate: {
								count: String(state?.publishedPersonalWorkflowsCount ?? 0),
							},
						})
					}}
				</N8nText>
			</div>
		</div>

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
	</div>
</template>

<style module>
.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--2xs) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--md) var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.settingsCountRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
}
</style>
