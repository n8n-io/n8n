<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';

/**
 * Shows the top of its content, with a fade and a button that shows the rest.
 * Content that fits shows whole, without the button.
 * Focus inside the content shows the rest, so that the user sees the text that they edit.
 */
const i18n = useI18n();

const content = useTemplateRef<HTMLElement>('content');
/** An element that has the height of the clip. */
const ruler = useTemplateRef<HTMLElement>('ruler');

const isExpanded = ref(false);
/** True when the content is taller than the clip. */
const isLong = ref(false);

function measure(): void {
	if (content.value && ruler.value) {
		isLong.value = content.value.offsetHeight > ruler.value.offsetHeight;
	}
}

/** Measures the content each time its size changes, until the component unmounts. */
function measureOnResize(): void {
	const observer = 'ResizeObserver' in window ? new ResizeObserver(measure) : undefined;
	onMounted(() => {
		if (content.value) {
			observer?.observe(content.value);
		}
	});
	onBeforeUnmount(() => observer?.disconnect());
}

measureOnResize();
</script>

<template>
	<div :class="$style.clipped">
		<div ref="ruler" :class="$style.ruler" aria-hidden="true" />
		<div
			:class="[$style.clip, { [$style.collapsed]: !isExpanded, [$style.faded]: isLong }]"
			data-test-id="clipped-content"
			@focusin="isExpanded = true"
		>
			<div ref="content">
				<slot />
			</div>
		</div>
		<button
			v-if="isLong"
			type="button"
			:class="$style.toggle"
			:aria-expanded="isExpanded"
			data-test-id="clipped-content-toggle"
			@click="isExpanded = !isExpanded"
		>
			{{
				i18n.baseText(isExpanded ? 'page.clippedContent.showLess' : 'page.clippedContent.showMore')
			}}
			<N8nIcon :icon="isExpanded ? 'chevron-up' : 'chevron-down'" size="xsmall" />
		</button>
	</div>
</template>

<style lang="scss" module>
.clipped {
	--clipped-content--height: var(--spacing--4xl);

	position: relative;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.ruler {
	position: absolute;
	height: var(--clipped-content--height);
	visibility: hidden;
	pointer-events: none;
}

.clip {
	width: 100%;
	min-width: 0;
}

.collapsed {
	max-height: var(--clipped-content--height);
	overflow: hidden;

	&.faded {
		mask-image: linear-gradient(to bottom, black 55%, transparent);
	}
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0;
	border: 0;
	background-color: transparent;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	transition: color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
