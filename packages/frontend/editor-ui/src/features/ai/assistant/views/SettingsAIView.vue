<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
	N8nCheckbox,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { useTelemetry } from '@n8n/composables/useTelemetry';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const message = useMessage();
const telemetry = useTelemetry();

const assistantStore = useAssistantStore();
const settingsStore = useSettingsStore();

const allowSendingSchema = ref(true);

const isAssistantEnabled = computed(() => assistantStore.isAssistantEnabled);
const isBuilderEnabled = computed(() => settingsStore.isAiBuilderEnabled);
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
	if (isBuilderEnabled.value) {
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
		telemetry.track('User changed AI Usage settings', {
			allow_sending_parameter_values: newValue,
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
	<N8nSettingsLayout data-test-id="ai">
		<N8nSettingsPageHeader :title="i18n.baseText('settings.ai')" :show-docs-link="false">
			<template #description>
				<N8nText v-n8n-html="aiSettingsDescription" size="medium" color="text-base" />
			</template>
		</N8nSettingsPageHeader>

		<N8nSettingsSection>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.ai.allowSendingSchema.label')"
					:description="i18n.baseText('settings.ai.allowSendingSchema.description')"
				>
					<template #action>
						<N8nCheckbox
							v-model="allowSendingSchema"
							:disabled="true"
							:aria-label="i18n.baseText('settings.ai.allowSendingSchema.label')"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					:title="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
					:description="i18n.baseText('settings.ai.allowSendingParameterValues.description')"
				>
					<template #action>
						<N8nCheckbox
							:model-value="allowSendingParameterValues"
							:aria-label="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
							@update:model-value="onallowSendingParameterValuesChange"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<div :class="$style.privacyNote">
			<N8nText :bold="true">{{ i18n.baseText('settings.ai.privacyNote.heading') }}</N8nText>
			<N8nText
				v-n8n-html="
					i18n.baseText('settings.ai.privacyNote.content', {
						interpolate: { docsLink: 'https://docs.n8n.io/manage-cloud/ai-assistant' },
					})
				"
				color="text-base"
			/>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
.privacyNote {
	span + span {
		margin-left: var(--spacing--4xs);
	}
}
</style>
