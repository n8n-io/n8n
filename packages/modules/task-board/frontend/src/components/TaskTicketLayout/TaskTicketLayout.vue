<script setup lang="ts">
import { N8nScrollArea } from '@n8n/design-system';

/**
 * The arrangement of one task. `columns` puts the side column on the right of the main
 * column. `stacked` is the narrow form: the side column goes between the header and the
 * main content. The footer stays below the main content and does not scroll.
 */
defineProps<{ variant: 'columns' | 'stacked' }>();
defineSlots<{
	/** The title of the task. */
	header(): unknown;
	/** The description and the comment thread. */
	main(): unknown;
	/** The fields of the task. */
	side(): unknown;
	/** The reply box. */
	footer?(): unknown;
}>();
</script>

<template>
	<div v-if="variant === 'columns'" :class="[$style.layout, $style.columns]">
		<div :class="$style.mainColumn">
			<N8nScrollArea :class="$style.scroll" type="hover">
				<div :class="$style.content">
					<slot name="header" />
					<slot name="main" />
				</div>
			</N8nScrollArea>
			<footer v-if="$slots.footer" :class="$style.footer"><slot name="footer" /></footer>
		</div>
		<aside :class="$style.sideColumn">
			<N8nScrollArea :class="$style.scroll" type="hover">
				<div :class="$style.content"><slot name="side" /></div>
			</N8nScrollArea>
		</aside>
	</div>
	<div v-else :class="[$style.layout, $style.stacked]">
		<N8nScrollArea :class="$style.scroll" type="hover">
			<div :class="$style.content">
				<slot name="header" />
				<div :class="$style.sideBlock"><slot name="side" /></div>
				<slot name="main" />
			</div>
		</N8nScrollArea>
		<footer v-if="$slots.footer" :class="$style.footer"><slot name="footer" /></footer>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/breakpoints';

.layout {
	display: flex;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.stacked {
	flex-direction: column;
}

.mainColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.sideColumn {
	display: flex;
	flex: 0 0 auto;
	/* The side column keeps one width, so the values line up. No spacing token is this wide. */
	width: 20rem;
	min-height: 0;
	border-left: var(--border);
}

.scroll {
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--md);
}

.sideBlock {
	padding-bottom: var(--spacing--md);
	border-bottom: var(--border);
}

.footer {
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--md);
	border-top: var(--border);
}

.columns {
	@include breakpoints.breakpoint('sm-and-down') {
		flex-direction: column;
		overflow-y: auto;

		.mainColumn {
			flex: 0 0 auto;
		}

		.sideColumn {
			width: 100%;
			border-left: none;
			border-top: var(--border);
		}
	}
}
</style>
