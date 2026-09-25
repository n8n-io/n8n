<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { N8nCallout, N8nHeading, N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const telemetry = useTelemetry();

const assistantStore = useAssistantStore();
const settingsStore = useSettingsStore();

const allowSendingSchema = ref(true);

const isAssistantEnabled = computed(() => assistantStore.isAssistantEnabled);
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

// The setting is deprecated: it can only be turned on.
const onallowSendingParameterValuesChange = async (newValue: boolean | string | number) => {
	if (newValue !== true) return;

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
	<div :class="$style.container" data-test-id="ai">
		<div :class="$style.header">
			<N8nHeading size="2xlarge">{{ i18n.baseText('settings.ai') }}</N8nHeading>
			<N8nText v-n8n-html="aiSettingsDescription" size="small" color="text-light" />
		</div>
		<div :class="$style.content">
			<div :class="$style.checkboxContainer">
				<N8nCheckbox
					v-model="allowSendingSchema"
					:disabled="true"
					:label="i18n.baseText('settings.ai.allowSendingSchema.label')"
				/>
				<N8nText :class="$style.checkboxDescription" color="text-base">
					{{ i18n.baseText('settings.ai.allowSendingSchema.description') }}
				</N8nText>
			</div>
			<div :class="$style.checkboxContainer">
				<N8nCheckbox
					:model-value="allowSendingParameterValues"
					:disabled="allowSendingParameterValues"
					:label="i18n.baseText('settings.ai.allowSendingParameterValues.label')"
					@update:model-value="onallowSendingParameterValuesChange"
				/>
				<N8nText :class="$style.checkboxDescription" color="text-base">
					{{ i18n.baseText('settings.ai.allowSendingParameterValues.description') }}
				</N8nText>
				<N8nCallout
					v-if="!allowSendingParameterValues"
					:class="$style.notice"
					theme="warning"
					data-test-id="ai-data-sharing-deprecation-notice"
				>
					{{ i18n.baseText('settings.ai.allowSendingParameterValues.deprecated') }}
					<template v-if="!settingsStore.isCloudDeployment">
						{{ i18n.baseText('settings.ai.allowSendingParameterValues.deprecated.envVar') }}
					</template>
				</N8nCallout>
			</div>
		</div>
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
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.checkboxContainer {
	display: flex;
	flex-direction: column;
	border: var(--border-width) var(--border-style) var(--color--info--tint-1);
	border-radius: var(--radius);
	padding: var(--spacing--md) var(--spacing--md) var(--spacing--xs);

	label {
		font-weight: var(--font-weight--bold);
		padding-bottom: var(--spacing--5xs);
	}

	.checkboxDescription {
		padding: var(--spacing--2xs) var(--spacing--xl);
	}

	.notice {
		margin-left: var(--spacing--xl);
		margin-top: var(--spacing--2xs);
	}
}

.privacyNote {
	span + span {
		margin-left: var(--spacing--4xs);
	}
}
</style>
