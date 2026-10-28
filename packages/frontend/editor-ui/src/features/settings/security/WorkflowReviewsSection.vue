<script lang="ts" setup>
import { ref } from 'vue';
import { N8nAlertDialog, N8nSettingsEnableRow } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';

const props = defineProps<{
	initialEnabled: boolean;
	managedByEnv: boolean;
}>();

const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const enabled = ref(props.initialEnabled);
const showDisableDialog = ref(false);
const isSaving = ref(false);

async function persist(value: boolean): Promise<void> {
	const previousValue = enabled.value;
	enabled.value = value;
	isSaving.value = true;

	try {
		const response = await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			workflowReviews: { enabled: value },
		});
		if (response.workflowReviews) {
			enabled.value = response.workflowReviews.enabled;
			settingsStore.setWorkflowReviewsPolicy(response.workflowReviews);
		}
		showToast({
			type: 'success',
			title: i18n.baseText(
				`settings.security.workflowReviews.success.${enabled.value ? 'enabled' : 'disabled'}`,
			),
			message: '',
		});
	} catch (error) {
		enabled.value = previousValue;
		showError(error, i18n.baseText('settings.security.workflowReviews.error'));
	} finally {
		isSaving.value = false;
	}
}

function confirmDisable() {
	showDisableDialog.value = false;
	void persist(false);
}

function onToggle(value: boolean) {
	if (!value) {
		showDisableDialog.value = true;
		return;
	}
	void persist(true);
}
</script>

<template>
	<!-- `display: contents` keeps the enable row a direct child of the settings card. -->
	<div :class="$style.root">
		<N8nSettingsEnableRow
			feature="workflowReviews"
			show-badges
			:title="i18n.baseText('settings.security.workflowReviews.enable.title')"
			:description="i18n.baseText('settings.security.workflowReviews.enable.description')"
			:max-description-lines="3"
			:model-value="enabled"
			:disabled="managedByEnv || isSaving"
			switch-test-id="security-workflow-reviews-toggle"
			@update:model-value="onToggle"
		/>
		<N8nAlertDialog
			:open="showDisableDialog"
			:title="i18n.baseText('settings.security.workflowReviews.confirmDisable.headline')"
			:description="i18n.baseText('settings.security.workflowReviews.confirmDisable.message')"
			@action="confirmDisable"
			@cancel="showDisableDialog = false"
			@update:open="showDisableDialog = $event"
		/>
	</div>
</template>

<style module>
.root {
	display: contents;
}
</style>
