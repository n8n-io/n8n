<script lang="ts" setup>
import { computed, ref, useCssModule } from 'vue';
import { ElSwitch } from 'element-plus';
import { N8nAlertDialog, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as securitySettingsApi from '@n8n/rest-api-client/api/security-settings';
import { useToast } from '@/app/composables/useToast';

const props = defineProps<{
	initialEnabled: boolean;
	managedByEnv: boolean;
}>();

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();
const { showToast, showError } = useToast();

const enabled = ref(props.initialEnabled);
const showDisableDialog = ref(false);
const isSaving = ref(false);

const toggleValue = computed({
	get: () => enabled.value,
	set: (value: boolean) => {
		if (!value) {
			showDisableDialog.value = true;
			return;
		}
		void persist(true);
	},
});

async function persist(value: boolean): Promise<void> {
	const previousValue = enabled.value;
	enabled.value = value;
	isSaving.value = true;
	try {
		await securitySettingsApi.updateSecuritySettings(rootStore.restApiContext, {
			workflowReviews: { enabled: value },
		});
		showToast({
			type: 'success',
			title: i18n.baseText(
				value
					? 'settings.security.workflowReviews.success.enabled'
					: 'settings.security.workflowReviews.success.disabled',
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
</script>

<template>
	<div>
		<div :class="$style.settingsContainer">
			<div :class="$style.settingsContainerInfo">
				<N8nText :bold="true">
					{{ i18n.baseText('settings.security.workflowReviews.enable.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('settings.security.workflowReviews.enable.description') }}
				</N8nText>
			</div>
			<div :class="$style.settingsContainerAction">
				<ElSwitch
					v-model="toggleValue"
					size="large"
					:disabled="managedByEnv || isSaving"
					data-test-id="security-workflow-reviews-toggle"
				/>
			</div>
		</div>

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
</style>
