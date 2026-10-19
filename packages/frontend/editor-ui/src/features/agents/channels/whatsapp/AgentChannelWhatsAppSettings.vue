<script setup lang="ts">
/**
 * Runtime behavior of the WhatsApp channel. None of these need Meta's approval,
 * so they change here at any time, whichever way the channel was set up.
 */
import {
	N8nInputNumber,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { WHATSAPP_MEDIA_RETENTION_DAYS_MAX, type resolveWhatsAppSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

export type WhatsAppChannelSettings = ReturnType<typeof resolveWhatsAppSettings>;

const value = defineModel<WhatsAppChannelSettings>({ required: true });

const i18n = useI18n();

function set(patch: Partial<WhatsAppChannelSettings>) {
	value.value = { ...value.value, ...patch };
}

// A cleared field gives no number. Keep the last valid value instead of saving nothing.
function setRetention(days: number) {
	if (Number.isInteger(days) && days >= 1 && days <= WHATSAPP_MEDIA_RETENTION_DAYS_MAX) {
		set({ mediaRetentionDays: days });
	}
}
</script>

<template>
	<N8nSettingsRowGroup :class="$style.group" data-testid="whatsapp-settings">
		<N8nSettingsRow
			:title="i18n.baseText('agents.channels.whatsapp.settings.typingIndicator')"
			:description="i18n.baseText('agents.channels.whatsapp.settings.typingIndicatorHint')"
		>
			<template #action>
				<N8nSwitch2
					:model-value="value.typingIndicator"
					:aria-label="i18n.baseText('agents.channels.whatsapp.settings.typingIndicator')"
					data-testid="whatsapp-typing-indicator"
					@update:model-value="set({ typingIndicator: $event })"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			:title="i18n.baseText('agents.channels.whatsapp.settings.downloadMedia')"
			:description="i18n.baseText('agents.channels.whatsapp.settings.downloadMediaHint')"
		>
			<template #action>
				<N8nSwitch2
					:model-value="value.downloadMedia"
					:aria-label="i18n.baseText('agents.channels.whatsapp.settings.downloadMedia')"
					data-testid="whatsapp-download-media"
					@update:model-value="set({ downloadMedia: $event })"
				/>
			</template>
		</N8nSettingsRow>
		<N8nSettingsRow
			:title="i18n.baseText('agents.channels.whatsapp.settings.mediaRetention')"
			:description="i18n.baseText('agents.channels.whatsapp.settings.mediaRetentionHint')"
			:show-divider="false"
		>
			<template #action>
				<div :class="$style.retention">
					<N8nInputNumber
						:model-value="value.mediaRetentionDays"
						:min="1"
						:max="WHATSAPP_MEDIA_RETENTION_DAYS_MAX"
						:precision="0"
						size="small"
						:class="$style.retentionInput"
						:aria-label="i18n.baseText('agents.channels.whatsapp.settings.mediaRetention')"
						data-testid="whatsapp-media-retention"
						@update:model-value="setRetention"
					/>
					<N8nText size="small" :class="$style.unit">
						{{
							i18n.baseText('agents.channels.whatsapp.settings.mediaRetentionUnit', {
								adjustToNumber: value.mediaRetentionDays,
							})
						}}
					</N8nText>
				</div>
			</template>
		</N8nSettingsRow>
	</N8nSettingsRowGroup>
</template>

<style module lang="scss">
/* Same as the Teams availability panel: let the modal show through in dark mode. */
.group.group {
	background: transparent;
}

.retention {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.retentionInput {
	width: 80px;
}

.unit {
	color: var(--text-color--subtler);
}
</style>
