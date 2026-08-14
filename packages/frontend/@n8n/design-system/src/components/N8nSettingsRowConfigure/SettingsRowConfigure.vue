<script setup lang="ts">
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export interface SettingsRowConfigureProps {
	/**
	 * The affordance text. Defaults to "Configure" (the not-configured state). Pass the
	 * configured-state free text (e.g. "2 of 3 devices", "Enabled", "n8n.example.com") to
	 * replace the label once the setting is configured. The trailing chevron is always shown.
	 */
	value?: string;
}

defineOptions({ name: 'N8nSettingsRowConfigure' });

withDefaults(defineProps<SettingsRowConfigureProps>(), {
	value: 'Configure',
});
</script>

<template>
	<span :class="$style.configure" data-test-id="settings-row-configure">
		<N8nText :class="$style.value" size="small" color="text-dark">{{ value }}</N8nText>
		<N8nIcon :class="$style.chevron" icon="chevron-right" size="small" />
	</span>
</template>

<style lang="scss" module>
@use '../../css/mixins/utils';

.configure {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.value {
	min-width: 0;
	@include utils.utils-ellipsis;
}

.chevron {
	flex: 0 0 auto;
	color: var(--icon-color);
}
</style>
