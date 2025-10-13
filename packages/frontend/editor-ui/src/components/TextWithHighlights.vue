<script lang="ts" setup>
import { splitTextBySearch } from '@/utils/stringUtils';
import type { GenericValue } from 'n8n-workflow';
import { computed } from 'vue';

const props = defineProps<{
	content: GenericValue;
	search?: string;
}>();

const parts = computed(() => {
	return props.search && typeof props.content === 'string'
		? splitTextBySearch(props.content, props.search)
		: [];
});
</script>

<template>
	<span v-if="parts.length && typeof props.content === 'string'">
		<template v-for="(part, index) in parts">
			<mark v-if="part.isMatched && part.content" :key="`mark-${index}`">
				{{ part.content }}
			</mark>
			<span v-else-if="part.content" :key="`span-${index}`">{{ part.content }}</span>
		</template>
	</span>
	<span v-else :class="$style.content">
		<template v-if="typeof props.content === 'string'">
			<span v-for="(line, index) in props.content.split('\n')" :key="`line-${index}`">
				<span v-if="index > 0" :class="$style.newLine">\n</span>{{ line }}
			</span>
		</template>
		<span v-else v-text="props.content" />
	</span>
</template>

<style lang="scss" module>
:root .content .newLine {
	font-family: var(--font-family--monospace);
	color: var(--color-line-break);
	padding-right: 2px;
}
</style>
