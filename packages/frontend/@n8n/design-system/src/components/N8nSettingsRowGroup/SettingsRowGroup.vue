<script setup lang="ts">
export interface SettingsRowGroupProps {
	/** Element/component to render as the group container. */
	tag?: string;
}

defineOptions({ name: 'N8nSettingsRowGroup' });

withDefaults(defineProps<SettingsRowGroupProps>(), {
	tag: 'div',
});
</script>

<template>
	<component :is="tag" :class="$style.group" data-test-id="settings-row-group">
		<slot />
	</component>
</template>

<style lang="scss" module>
.group {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
	overflow: clip;

	// Auto-hide the divider of the last row so consumers don't manage `showDivider`
	// for the common case. Individual rows can still opt out with `show-divider="false"`.
	// Scoped to the row's own (direct) divider so dividers nested inside a row's expanded
	// region keep rendering as continuation rows.
	> :last-child > [data-test-id='settings-row-divider'] {
		display: none;
	}
}
</style>
