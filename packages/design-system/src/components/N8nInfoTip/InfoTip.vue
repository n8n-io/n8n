<template functional>
	<div :class="$style.infotip">
		<component :is="$options.components.N8nIcon" icon="info-circle" /> <span><slot></slot></span>
	</div>
</template>

<script lang="ts">
import N8nIcon from '../N8nIcon';

export default {
	name: 'n8n-info-tip',
	components: {
		N8nIcon,
	},
};
</script>

<style lang="scss" module>
.infotip {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-size-s);
	word-break: normal;
	display: flex;
	align-items: center;

	svg {
		font-size: var(--font-size-s);
		margin-right: var(--spacing-4xs);
	}
}
</style>
