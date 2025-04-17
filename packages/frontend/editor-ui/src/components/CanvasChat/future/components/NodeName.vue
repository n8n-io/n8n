<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

const { name, latestName, isError } = defineProps<{
	name: string;
	latestName: string;
	isError?: boolean;
}>();
</script>

<template>
	<N8nText
		tag="div"
		:bold="true"
		size="small"
		:class="$style.name"
		:color="isError ? 'danger' : undefined"
	>
		<span v-if="name !== latestName" :class="$style.renamed">
			{{ name }}
		</span>
		{{ latestName }}
	</N8nText>
</template>

<style lang="scss" module>
.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.renamed {
	text-decoration: line-through;
	margin-right: var(--spacing-4xs);
}
</style>
