<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
const {
	dataCount,
	unfilteredDataCount,
	subExecutionsCount = 0,
	search,
} = defineProps<{
	dataCount: number;
	unfilteredDataCount: number;
	subExecutionsCount?: number;
	search: string;
}>();

const i18n = useI18n();
</script>

<template>
	<N8nText v-if="search" :class="$style.itemsText" data-test-id="run-data-item-count">
		{{
			i18n.baseText('ndv.search.items', {
				adjustToNumber: unfilteredDataCount,
				interpolate: { matched: dataCount, count: unfilteredDataCount },
			})
		}}
	</N8nText>
	<N8nText v-else :class="$style.itemsText" data-test-id="run-data-item-count">
		<span>
			{{
				i18n.baseText('ndv.output.items', {
					adjustToNumber: dataCount,
					interpolate: { count: dataCount },
				})
			}}
		</span>
		<span v-if="subExecutionsCount > 0">
			{{
				i18n.baseText('ndv.output.andSubExecutions', {
					adjustToNumber: subExecutionsCount,
					interpolate: { count: subExecutionsCount },
				})
			}}
		</span>
	</N8nText>
</template>

<style lang="scss" module>
.itemsText {
	flex-shrink: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}
</style>
