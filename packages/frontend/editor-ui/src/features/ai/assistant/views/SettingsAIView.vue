<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { N8nHeading, N8nInfoTip, N8nCheckbox, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const message = useMessage();

const assistantStore = useAssistantStore();
const settingsStore = useSettingsStore();

const allowSendingSchema = ref(true);

const isAssistantEnabled = computed(() => assistantStore.isAssistantEnabled);
const isBulderEnabled = computed(() => settingsStore.isAiBuilderEnabled);
const isAskAiEnabled = computed(() => settingsStore.isAskAiEnabled);
const allowSendingParameterValues = computed(() => settingsStore.isAiDataSharingEnabled);

const aiSettingsDescription = computed(() => {
	if (isAssistantEnabled.value && isAskAiEnabled.value) {
		return i18n.baseText('settings.ai.description.both');
	} else if (isAssistantEnabled.value) {
		return i18n.baseText('settings.ai.description.assistantOnly');
	} else if (isAskAiEnabled.value) {
		return i18n.baseText('settings.ai.description.askAiOnly');
	}
	// Fallback to 'both' if neither is enabled (edge case)
	return i18n.baseText('settings.ai.description.both');
});

const confirmationMessage = computed(() => {
	if (isBulderEnabled.value) {
		return i18n.baseText('settings.ai.confirm.message.builderEnabled');
	}
	return i18n.baseText('settings.ai.confirm.message.builderDisabled');
});

const onallowSendingParameterValuesChange = async (newValue: boolean | string | number) => {
	if (typeof newValue !== 'boolean') return;

	if (!newValue) {
		const promptResponse = await message.confirm(confirmationMessage.value, {
			title: i18n.baseText('settings.ai.confirm.title'),
			confirmButtonText: i18n.baseText('settings.ai.confirm.confirmButtonText'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		});
		if (promptResponse !== MODAL_CONFIRM) {
			return;
		}
	}
	try {
		await settingsStore.updateAiDataSharingSettings(newValue);
		toast.showMessage({
			title: i18n.baseText('settings.ai.updated.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.ai.updated.error'));
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.ai'));
});
</script>

<template>
	<div :class="$style.container" data-test-id="ai">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.ai') }}</N8nHeading>
			<N8nInfoTip theme="info" type="note">
				<span v-n8n-html="aiSettingsDescription"></span>
			</N8nInfoTip>
		</div>
		<div :class="$style.content">
			<N8nCheckbox
				v-model="allowSendingSchema"
				:disabled="true"
				:label="i18n.baseText('settings.ai.allowSendingSchema.label')"
				:tooltip-text="i18n.baseText('settings.ai.allowSendingSchema.description')"
			/>
			<N8nCheckbox
				:model-value="allowSendingParameterValues"
				:label="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
				:tooltip-text="i18n.baseText('settings.ai.allowSendingParameterValues.description')"
				@update:model-value="onallowSendingParameterValuesChange"
			/>
			<N8nNotice v-if="!allowSendingParameterValues" type="warning" :closable="false">
				{{ i18n.baseText('settings.ai.efficiencyNotice') }}
			</N8nNotice>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--md);
}
</style>
