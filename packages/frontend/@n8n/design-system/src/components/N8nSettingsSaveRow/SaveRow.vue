<script setup lang="ts">
import N8nButton from '../N8nButton';

export interface SettingsSaveRowProps {
	/** Primary button label. */
	saveLabel?: string;
	/** Secondary button label. */
	discardLabel?: string;
	/** Puts the Save button in its loading state while a save is in flight. */
	saving?: boolean;
	/** Disables both buttons. The consumer decides when there is something to save. */
	disabled?: boolean;
}

defineOptions({ name: 'N8nSettingsSaveRow' });

withDefaults(defineProps<SettingsSaveRowProps>(), {
	saveLabel: 'Save settings',
	discardLabel: 'Discard changes',
	saving: false,
	disabled: false,
});

const emit = defineEmits<{ save: []; discard: [] }>();
</script>

<template>
	<div :class="$style.row" data-test-id="settings-save-row">
		<N8nButton
			variant="solid"
			:label="saveLabel"
			:loading="saving"
			:disabled="disabled"
			data-test-id="settings-save-row-save"
			@click="emit('save')"
		/>
		<N8nButton
			variant="subtle"
			:label="discardLabel"
			:disabled="disabled || saving"
			data-test-id="settings-save-row-discard"
			@click="emit('discard')"
		/>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
