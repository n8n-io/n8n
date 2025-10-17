<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { N8nHeading, N8nInfoTip, N8nCheckbox, N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useMessage } from '@/composables/useMessage';
import { MODAL_CONFIRM } from '@/constants';
import { useBuilderStore } from '../builder.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const message = useMessage();

const assistantStore = useAssistantStore();
const builderStore = useBuilderStore();
const settingsStore = useSettingsStore();

const allowSendingSchema = ref(true);

const isAssistantEnabled = computed(() => assistantStore.isAssistantEnabled);
const isBulderEnabled = computed(() => builderStore.isAIBuilderEnabled);
const isAskAiEnabled = computed(() => settingsStore.isAskAiEnabled);
const allowSendingActualData = computed(() => settingsStore.isAiDataSharingEnabled);

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

const efficiencyNotice = computed(() => {
	if (isBulderEnabled.value) {
		return i18n.baseText('settings.ai.efficiencyNotice.builderEnabled');
	}
	return i18n.baseText('settings.ai.efficiencyNotice.builderDisabled');
});

const confirmationMessage = computed(() => {
	if (isBulderEnabled.value) {
		return i18n.baseText('settings.ai.confirm.message.builderEnabled');
	}
	return i18n.baseText('settings.ai.confirm.message.builderDisabled');
});

const onAllowSendingActualDataChange = async (newValue: boolean | string | number) => {
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
				:model-value="allowSendingActualData"
				:label="i18n.baseText('settings.ai.allowSendingActualData.label')"
				:tooltip-text="i18n.baseText('settings.ai.allowSendingActualData.description')"
				@update:model-value="onAllowSendingActualDataChange"
			/>
			<N8nNotice v-if="!allowSendingActualData" type="warning" :closable="false">
				{{ efficiencyNotice }}
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
