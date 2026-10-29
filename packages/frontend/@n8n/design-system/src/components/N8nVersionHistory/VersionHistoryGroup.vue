<script setup lang="ts">
import N8nIcon from '../N8nIcon';
import { N8nListboxItem } from '../N8nListbox';
import N8nText from '../N8nText/Text.vue';
import VersionHistoryRail from './VersionHistoryRail.vue';

defineOptions({ name: 'N8nVersionHistoryGroup' });

defineProps<{
	/** Value for the list row. Unique across versions and groups. */
	id: string;
	label: string;
	expanded: boolean;
	connectAbove?: boolean;
	connectBelow?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
}>();

function onSelect(event: Event) {
	event.preventDefault();
	emit('toggle');
}

// The chevron stays at the smallest icon size so the timeline meets a 10px mark.
const iconProps = {
	size: 'xsmall' as const,
};
</script>

<template>
	<N8nListboxItem
		:value="id"
		:class="$style.group"
		:aria-expanded="expanded"
		data-test-id="version-history-group"
		@select="onSelect"
	>
		<VersionHistoryRail mark="icon" :connect-above="connectAbove" :connect-below="connectBelow">
			<span :class="$style.chevron">
				<N8nIcon v-bind="iconProps" :icon="expanded ? 'chevron-down' : 'chevron-right'" />
			</span>
		</VersionHistoryRail>
		<N8nText size="small" color="text-base" :class="$style.label">{{ label }}</N8nText>
	</N8nListboxItem>
</template>

<style lang="scss" module>
.group {
	display: flex;
	align-items: center;
	width: 100%;
	margin: 0;
	// Taller than the label so the track can stop short of the chevron.
	min-height: var(--height--xs);
	// Match the version row inset so the rail lines up.
	padding: 0;
	padding-inline: var(--version-history--body-pad, var(--spacing--3xs));
	border-radius: var(--radius);
	text-align: start;
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	display: flex;
	color: var(--icon-color);
}

.group[data-highlighted] .chevron {
	color: var(--color--text--shade-1);
}
</style>
