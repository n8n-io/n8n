<script setup lang="ts">
import { ref, useId, watch } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import shared from '../styles/agent-panel.module.scss';

const props = defineProps<{
	title: string;
	description?: string;
	defaultOpen?: boolean;
}>();

const open = ref(props.defaultOpen ?? false);
const contentId = useId();

watch(
	() => props.defaultOpen,
	(configured) => {
		if (configured) open.value = true;
	},
);
</script>

<template>
	<div>
		<button
			type="button"
			:class="$style.trigger"
			:aria-expanded="open"
			:aria-controls="contentId"
			@click="open = !open"
		>
			<span :class="$style.heading">
				<N8nText :class="shared.dataEntryLabel">{{ title }}</N8nText>
				<N8nText v-if="description" :class="shared.dataEntrySubLabel">{{ description }}</N8nText>
			</span>
			<N8nIcon :icon="open ? 'chevron-up' : 'chevron-down'" :size="12" aria-hidden="true" />
		</button>
		<div v-show="open" :id="contentId" :class="$style.content">
			<slot />
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';

.trigger {
	@include focus.focus-visible-ring;

	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	width: 100%;
	border: 0;
	background: transparent;
	border-radius: var(--radius);
	color: var(--text-color--subtle);
	padding: 0;
	text-align: start;
	cursor: pointer;

	> svg {
		flex-shrink: 0;
	}
}
.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}
.content {
	padding-block-start: var(--spacing--sm);
}
</style>
