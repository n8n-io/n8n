<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants/modals';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const message = useMessage();

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
	set: async (value: boolean) => {
		if (!value) {
			const confirmed = await message.confirm(
				i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.message'),
				i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.headline'),
				{
					cancelButtonText: i18n.baseText('generic.cancel'),
					confirmButtonText: i18n.baseText('generic.confirm'),
				},
			);
			if (confirmed !== MODAL_CONFIRM) return;
		}
		if (state.value) {
			state.value = { ...state.value, personalSpacePublishing: value };
		}
		await updatePersonalSpaceSetting('personalSpacePublishing', value, 'publishing');
	},
});

const personalSpaceSharing = computed({
	get: () => state.value?.personalSpaceSharing ?? false,
	set: async (value: boolean) => {
		if (!value) {
			const confirmed = await message.confirm(
				i18n.baseText('settings.security.personalSpace.sharing.confirmMessage.disable.message'),
				i18n.baseText('settings.security.personalSpace.sharing.confirmMessage.disable.headline'),
				{
					cancelButtonText: i18n.baseText('generic.cancel'),
					confirmButtonText: i18n.baseText('generic.confirm'),
				},
			);
			if (confirmed !== MODAL_CONFIRM) return;
		}
		if (state.value) {
			state.value = { ...state.value, personalSpaceSharing: value };
		}
		await updatePersonalSpaceSetting('personalSpaceSharing', value, 'sharing');
	},
});

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
	<div :class="$style.container">
		<N8nHeading tag="h1" size="2xlarge" class="mb-xl">
			{{ i18n.baseText('settings.security') }}
		</N8nHeading>

		<N8nHeading tag="h2" size="large" class="mb-l">
			{{ i18n.baseText('settings.security.personalSpace.title') }}
		</N8nHeading>

		<div :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.personalSpace.sharing.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.personalSpace.sharing.description') }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						v-model="personalSpaceSharing"
						:loading="isLoading"
						size="large"
						data-test-id="security-personal-space-sharing-toggle"
					/>
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
					<N8nText :bold="true">
						{{ i18n.baseText('settings.security.personalSpace.publishing.title') }}
					</N8nText>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('settings.security.personalSpace.publishing.description') }}
					</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						v-model="personalSpacePublishing"
						:loading="isLoading"
						size="large"
						data-test-id="security-personal-space-publishing-toggle"
					/>
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
	</div>
</template>

<style module>
.container {
	padding-bottom: var(--spacing--md);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	max-width: 600px;
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
