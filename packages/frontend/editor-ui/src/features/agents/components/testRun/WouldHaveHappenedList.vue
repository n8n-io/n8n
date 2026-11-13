<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

/** A comma-separated list, such as recipients, that collapses after a few items. */
const props = withDefaults(
	defineProps<{
		items: string[];
		maxVisible?: number;
	}>(),
	{ maxVisible: 3 },
);

const i18n = useI18n();
const expanded = ref(false);
const contentId = useId();

const hiddenCount = computed(() => Math.max(props.items.length - props.maxVisible, 0));
const visibleItems = computed(() =>
	expanded.value || hiddenCount.value === 0 ? props.items : props.items.slice(0, props.maxVisible),
);
</script>

<template>
	<span :class="$style.list">
		<span :class="$style.items" :id="contentId" data-test-id="would-have-happened-list">{{
			visibleItems.join(', ')
		}}</span>
		<N8nButton
			v-if="hiddenCount > 0"
			variant="ghost"
			size="xsmall"
			:class="$style.toggle"
			:aria-expanded="expanded"
			:aria-controls="contentId"
			data-test-id="would-have-happened-list-toggle"
			@click="expanded = !expanded"
		>
			{{
				expanded
					? i18n.baseText('agents.testRun.preview.showLess')
					: i18n.baseText('agents.testRun.preview.moreItems', {
							interpolate: { count: String(hiddenCount) },
						})
			}}
		</N8nButton>
	</span>
</template>

<style module lang="scss">
.list {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: baseline;
	column-gap: var(--spacing--4xs);
	min-width: 0;
}

.items {
	overflow-wrap: anywhere;
}

.toggle {
	align-self: center;
}
</style>
