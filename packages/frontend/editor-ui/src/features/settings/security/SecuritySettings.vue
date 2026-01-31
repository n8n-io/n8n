<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import type { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants/modals';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const message = useMessage();

const { state, isLoading } = useAsyncState(async () => {
	const settings = await securitySettingsApi.getSecuritySettings(rootStore.restApiContext);
	return settings.personalSpacePublishing;
}, undefined);

const personalSpacePublishing = computed({
	get: () => state.value ?? false,
	set: async (value: boolean) => {
		if (!value) {
			const confirmDisablingPublishing = await promptConfirmDisablingPersonalSpacePublishing();
			if (confirmDisablingPublishing !== MODAL_CONFIRM) {
				return;
			}
		}

		state.value = value;
		await updatePublishingSetting(value);
	},
});

async function promptConfirmDisablingPersonalSpacePublishing() {
	const confirmAction = await message.confirm(
		i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.message'),
		i18n.baseText('settings.security.personalSpace.publishing.confirmMessage.disable.headline'),
		{
			cancelButtonText: i18n.baseText('generic.cancel'),
			confirmButtonText: i18n.baseText('generic.confirm'),
		},
	);
	return confirmAction;
}

async function updatePublishingSetting(value: boolean) {
	try {
		const data: UpdateSecuritySettingsDto = {
			personalSpacePublishing: value,
		};

		await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, data);

		showToast({
			type: 'success',
			title: value
				? i18n.baseText('settings.security.personalSpace.publishing.success.enabled')
				: i18n.baseText('settings.security.personalSpace.publishing.success.disabled'),
			message: '',
		});
	} catch (error) {
		// Revert optimistic update on error
		state.value = !value;
		showError(error, i18n.baseText('settings.security.personalSpace.publishing.error'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<N8nHeading tag="h1" size="2xlarge" class="mb-xl">
			{{ i18n.baseText('settings.security') }}
		</N8nHeading>

		<N8nHeading tag="h2" size="large" class="mb-l">
			{{ i18n.baseText('settings.security.personalSpace.title') }}
		</N8nHeading>

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
	</div>
</template>

<style module>
.container {
	padding-bottom: var(--spacing--md);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	margin-bottom: var(--spacing--lg);
	justify-content: space-between;
	flex-shrink: 0;
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	max-width: 600px;
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
</style>
