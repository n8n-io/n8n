<script setup lang="ts">
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText/Text.vue';
import VersionHistoryRail from './VersionHistoryRail.vue';

defineOptions({ name: 'N8nVersionHistoryGroup' });

defineProps<{
	label: string;
	expanded: boolean;
	connectAbove?: boolean;
	connectBelow?: boolean;
}>();

const emit = defineEmits<{
	toggle: [];
}>();

// The chevron stays small so the timeline meets a 12px mark.
const iconProps = {
	size: 'small' as const,
	color: 'text-base' as const,
};
</script>

<template>
	<button
		type="button"
		:class="$style.group"
		:aria-expanded="expanded"
		data-test-id="version-history-group"
		@click="emit('toggle')"
	>
		<VersionHistoryRail mark="icon" :connect-above="connectAbove" :connect-below="connectBelow">
			<N8nIcon v-bind="iconProps" :icon="expanded ? 'chevron-down' : 'chevron-right'" />
		</VersionHistoryRail>
		<N8nText size="small" color="text-base" :class="$style.label">{{ label }}</N8nText>
	</button>
</template>

<style lang="scss" module>
@use '../../css/mixins/_focus.scss';

button.group {
	display: flex;
	align-items: center;
	width: 100%;
	margin: 0;
	// Clear the user-agent button padding and border so the rail lines up with version rows.
	padding: 0;
	padding-inline: var(--version-history--body-pad, var(--spacing--3xs));
	border: none;
	border-radius: var(--radius);
	appearance: none;
	background-color: transparent;
	color: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-1);
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
