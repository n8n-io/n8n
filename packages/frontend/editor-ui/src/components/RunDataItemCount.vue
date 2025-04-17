<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { N8nText } from '@n8n/design-system';

const {
	dataCount,
	unfilteredDataCount,
	subExecutionsCount = 0,
	search,
	muted,
} = defineProps<{
	dataCount: number;
	unfilteredDataCount: number;
	subExecutionsCount?: number;
	search: string;
	muted: boolean;
}>();

const i18n = useI18n();
</script>

<template>
	<N8nText v-if="search" :class="[$style.itemsText, muted ? $style.muted : '']">
		{{
			i18n.baseText('ndv.search.items', {
				adjustToNumber: unfilteredDataCount,
				interpolate: { matched: dataCount, count: unfilteredDataCount },
			})
		}}
	</N8nText>
	<N8nText v-else :class="[$style.itemsText, muted ? $style.muted : '']">
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
}

.muted {
	color: var(--color-text-light);
	font-size: var(--font-size-2xs);
}
</style>
