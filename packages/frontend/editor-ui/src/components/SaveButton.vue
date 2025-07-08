<script lang="ts" setup>
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { ButtonType } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		saved: boolean;
		isSaving?: boolean;
		disabled?: boolean;
		type?: ButtonType;
		withShortcut?: boolean;
		shortcutTooltip?: string;
		savingLabel?: string;
	}>(),
	{
		isSaving: false,
		type: 'primary',
		withShortcut: false,
		disabled: false,
	},
);

const i18n = useI18n();

const saveButtonLabel = computed(() => {
	return props.isSaving
		? (props.savingLabel ?? i18n.baseText('saveButton.saving'))
		: i18n.baseText('saveButton.save');
});

const shortcutTooltipLabel = computed(() => {
	return props.shortcutTooltip ?? i18n.baseText('saveButton.save');
});
</script>

<template>
	<span :class="$style.container" data-test-id="save-button">
		<span v-if="saved" :class="$style.saved">{{ i18n.baseText('saveButton.saved') }}</span>
		<template v-else>
			<KeyboardShortcutTooltip
				v-if="withShortcut"
				:label="shortcutTooltipLabel"
				:shortcut="{ keys: ['s'], metaKey: true }"
				placement="bottom"
			>
				<n8n-button
					:label="saveButtonLabel"
					:loading="isSaving"
					:disabled="disabled"
					:class="$style.button"
					:type="type"
				/>
			</KeyboardShortcutTooltip>
			<n8n-button
				v-else
				:label="saveButtonLabel"
				:loading="isSaving"
				:disabled="disabled"
				:class="$style.button"
				:type="type"
			/>
		</template>
	</span>
</template>

<style lang="scss" module>
.container {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	height: 30px;
}

.button {
	height: 30px;
}

.saved {
	color: $custom-font-very-light;
	font-size: 12px;
	font-weight: var(--font-weight-bold);
	line-height: 12px;
	text-align: center;
	padding: var(--spacing-2xs) var(--spacing-2xs);
	min-width: 53px;
}
</style>
