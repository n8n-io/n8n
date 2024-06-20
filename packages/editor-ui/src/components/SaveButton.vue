<template>
	<span :class="$style.container" data-test-id="save-button">
		<span v-if="saved" :class="$style.saved">{{ $locale.baseText('saveButton.saved') }}</span>
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

<script lang="ts">
import { defineComponent } from 'vue';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';

export default defineComponent({
	name: 'SaveButton',
	components: {
		KeyboardShortcutTooltip,
	},
	props: {
		saved: {
			type: Boolean,
		},
		isSaving: {
			type: Boolean,
		},
		disabled: {
			type: Boolean,
		},
		saveLabel: {
			type: String,
		},
		savingLabel: {
			type: String,
		},
		savedLabel: {
			type: String,
		},
		type: {
			type: String,
			default: 'primary',
		},
		withShortcut: {
			type: Boolean,
			default: false,
		},
		shortcutTooltip: {
			type: String,
		},
	},
	computed: {
		saveButtonLabel() {
			return this.isSaving
				? this.$locale.baseText('saveButton.saving')
				: this.$locale.baseText('saveButton.save');
		},
		shortcutTooltipLabel() {
			return this.shortcutTooltip ?? this.$locale.baseText('saveButton.save');
		},
	},
});
</script>

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
	font-weight: 600;
	line-height: 12px;
	text-align: center;
	padding: var(--spacing-2xs) var(--spacing-2xs);
	min-width: 53px;
}
</style>
