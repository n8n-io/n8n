<script setup lang="ts">
import { computed, useId } from 'vue';
import { N8nIcon } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		expanded: boolean;
		collapsible?: boolean;
		disabled?: boolean;
		label: string;
	}>(),
	{ collapsible: true, disabled: false },
);

const emit = defineEmits<{
	'update:expanded': [value: boolean];
}>();

const contentId = useId();
const isOpen = computed(() => !props.collapsible || props.expanded);
</script>

<template>
	<div :class="$style.outerContainer">
		<div :class="$style.container" :data-expanded="collapsible && expanded">
			<button
				v-if="collapsible"
				type="button"
				:class="[$style.toggle, { [$style.toggleExpanded]: isOpen }]"
				:aria-expanded="isOpen"
				:aria-label="label"
				:aria-controls="contentId"
				:disabled="disabled"
				@click="emit('update:expanded', !expanded)"
			>
				<slot name="header">{{ label }}</slot>
				<span :class="$style.trailing">
					<slot name="header-trailing" />
					<N8nIcon
						:icon="isOpen ? 'chevron-up' : 'chevron-down'"
						size="small"
						color="text-light"
						aria-hidden="true"
					/>
				</span>
			</button>
			<div
				:id="contentId"
				:class="[
					$style.content,
					{ [$style.contentOpen]: isOpen, [$style.contentStatic]: !collapsible },
				]"
				:inert="!isOpen"
			>
				<div :class="$style.contentInner"><slot /></div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.outerContainer {
	display: flex;
	flex-direction: column;
	min-width: 0;
	margin-inline: var(--spacing--sm);
}

.container {
	min-width: 0;
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--chat-container--radius, var(--radius--xl) var(--radius--xl) 0 0);
	background-clip: padding-box;
	padding-bottom: var(--spacing--sm);
	border-bottom: 0;
	transform: translateY(var(--spacing--sm));
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;

	&:hover[data-expanded='false'] {
		transform: translateY(calc(var(--spacing--sm) - var(--spacing--3xs)));
		background-color: color-mix(
			in srgb,
			var(--background--subtle),
			light-dark(var(--color--neutral-black), var(--color--neutral-white)) 2%
		);
	}
	margin: calc(-1 * var(--spacing--2xs)) calc(-1 * var(--spacing--2xs)) 0;
}

.toggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--xs);
	border: 0;
	background: transparent;
	border-radius: inherit;
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:disabled {
		cursor: default;
	}

	&:focus-visible {
		outline: var(--border);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}
}

.toggleExpanded {
	border-bottom: var(--border);
}

.trailing {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-shrink: 0;
	margin-inline-start: auto;
	margin-inline-end: var(--spacing--3xs);
}

.content {
	display: grid;
	grid-template-rows: 0fr;
	overflow: hidden;
	transition: grid-template-rows var(--duration--snappy) var(--easing--ease-out);
	@include motion.reduced-motion;
}

.contentOpen {
	grid-template-rows: 1fr;
}

.contentStatic {
	display: block;
	transition: none;
}

.contentInner {
	min-height: 0;
	overflow: hidden;
}
</style>
