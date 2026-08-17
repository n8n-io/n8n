<script setup lang="ts">
import type { SlackManagedAppSettings, SlackManagedAppSettingsErrorCode } from '@n8n/api-types';
import { N8nFormInput, N8nIcon, N8nLink, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import AgentChannelSlackServiceLimitError from '../channels/slack/AgentChannelSlackServiceLimitError.vue';

const props = defineProps<{
	settings: SlackManagedAppSettings | null;
	loading: boolean;
	error: boolean;
	saveError?: SlackManagedAppSettingsErrorCode | null;
	disabled?: boolean;
}>();

const i18n = useI18n();
const name = ref('');
const description = ref('');
const alwaysOnline = ref(false);

watch(
	() => props.settings,
	(settings) => {
		name.value = settings?.name ?? '';
		description.value = settings?.description ?? '';
		alwaysOnline.value = settings?.alwaysOnline ?? false;
	},
	{ immediate: true },
);

const validationError = computed(() => {
	if (!props.settings || props.loading || props.error) {
		return props.error ? i18n.baseText('agents.channels.slack.managed.settings.loadError') : null;
	}
	if (!name.value.trim()) {
		return i18n.baseText('agents.channels.slack.managed.settings.nameRequired');
	}
	if (name.value.length > 80) {
		return i18n.baseText('agents.channels.slack.managed.settings.nameTooLong');
	}
	if (!description.value.trim()) {
		return i18n.baseText('agents.channels.slack.managed.settings.descriptionRequired');
	}
	if (description.value.length > 140) {
		return i18n.baseText('agents.channels.slack.managed.settings.descriptionTooLong');
	}
	return null;
});

const currentSettings = computed(() =>
	props.settings
		? {
				credentialId: props.settings.credentialId,
				name: name.value.trim(),
				description: description.value.trim(),
				alwaysOnline: alwaysOnline.value,
			}
		: undefined,
);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.settings" data-testid="slack-managed-app-settings">
		<template v-if="settings">
			<N8nFormInput
				v-model="name"
				name="slackManagedBotName"
				:label="i18n.baseText('agents.channels.slack.managed.settings.name')"
				:info-text="i18n.baseText('agents.channels.slack.managed.settings.nameDescription')"
				:maxlength="80"
				required
				:disabled="disabled || loading"
				data-testid="slack-managed-app-name"
			/>
			<N8nFormInput
				v-model="description"
				name="slackManagedAppDescription"
				type="textarea"
				:label="i18n.baseText('agents.channels.slack.managed.settings.description')"
				:maxlength="140"
				required
				:disabled="disabled || loading"
				data-testid="slack-managed-app-description"
			/>
			<div :class="$style.switchRow">
				<N8nSwitch2
					:model-value="alwaysOnline"
					:disabled="disabled || loading"
					data-testid="slack-managed-app-always-online"
					:label="i18n.baseText('agents.channels.slack.managed.settings.alwaysOnline')"
					@update:model-value="alwaysOnline = Boolean($event)"
				/>
			</div>
			<N8nLink :href="settings.appHomeUrl" target="_blank" rel="noopener noreferrer" size="small">
				<span :class="$style.linkContent">
					{{ i18n.baseText('agents.channels.slack.managed.settings.openSlack') }}
					<N8nIcon icon="external-link" size="xsmall" />
				</span>
			</N8nLink>
			<N8nText v-if="validationError" size="small" :class="$style.error">
				{{ validationError }}
			</N8nText>
			<AgentChannelSlackServiceLimitError v-else-if="saveError === 'service_limits_exceeded'" />
		</template>

		<N8nText v-else-if="error" size="small" :class="$style.error">
			{{ i18n.baseText('agents.channels.slack.managed.settings.loadError') }}
		</N8nText>
		<N8nText v-else size="small" color="text-light">
			{{ i18n.baseText('generic.loading') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.settings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.linkContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.error {
	color: var(--text-color--danger);
}
</style>
