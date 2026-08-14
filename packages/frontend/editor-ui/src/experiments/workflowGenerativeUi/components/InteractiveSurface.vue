<script setup lang="ts">
import { computed } from 'vue';
import { useGenerativeUiLookOnly, useGenerativeUiNode } from '../nodeLookup';

const props = defineProps<{
	nodeId?: string | null;
	label: string;
	pressBound?: boolean;
}>();

const emit = defineEmits<{ press: [] }>();

const lookOnly = useGenerativeUiLookOnly();
const node = useGenerativeUiNode(() => props.nodeId);

const interactive = computed(
	() => Boolean(props.nodeId) && props.pressBound !== false && !lookOnly.value,
);

const accessibleName = computed(() => `Open ${node.value?.name ?? props.label}`);

function press() {
	if (interactive.value) emit('press');
}

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Enter' && event.key !== ' ') return;
	event.preventDefault();
	press();
}

const interactiveListeners = { click: press, keydown: onKeydown };
</script>

<template>
	<div
		:class="[$style.surface, interactive ? $style.interactive : undefined]"
		:role="interactive ? 'button' : undefined"
		:tabindex="interactive ? 0 : undefined"
		:aria-label="interactive ? accessibleName : undefined"
		v-on="interactive ? interactiveListeners : {}"
	>
		<slot />
	</div>
</template>

<style lang="scss" module>
.surface {
	display: block;
	min-width: 0;
}

.interactive {
	/* Children paint their own surfaces, so the affordance has to sit outside them. */
	cursor: pointer;
	border-radius: var(--radius--sm);

	&:hover {
		outline: var(--focus--border-width) solid var(--border-color--stronger);
		outline-offset: var(--spacing--5xs);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--5xs);
	}
}
</style>
