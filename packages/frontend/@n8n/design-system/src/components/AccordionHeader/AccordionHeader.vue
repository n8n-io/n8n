<script lang="ts" setup>
import { ref } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

interface Props {
	title: string;
}

defineOptions({ name: 'N8nInfoAccordion' });
withDefaults(defineProps<Props>(), {});

const emit = defineEmits<{
	toggle: [expanded: boolean];
}>();

const expanded = ref(false);

const toggle = () => {
	expanded.value = !expanded.value;
	emit('toggle', expanded.value);
};
</script>

<template>
	<div class="n8n-accordion-header">
		<div :class="[$style.header, $style.container]" @click="toggle">
			<N8nText :class="$style.headerText" color="text-base" size="small" align="left" bold>
				<span v-n8n-html="title"></span
			></N8nText>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div>
			<slot v-if="expanded" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--foreground);
}

.header {
	cursor: pointer;
	display: flex;
	padding: var(--spacing--sm);
	justify-content: flex-start;
	gap: var(--spacing--3xs);
}

.headerText {
	flex-grow: 1;
}

.description {
	display: flex;
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);

	b {
		font-weight: var(--font-weight--bold);
	}
}
</style>
