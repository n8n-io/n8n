<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

const { name, isError, isDeleted } = defineProps<{
	name: string;
	isError?: boolean;
	isDeleted?: boolean;
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
		<del v-if="isDeleted">
			{{ name }}
		</del>
		<template v-else>
			{{ name }}
		</template>
	</N8nText>
</template>

<style lang="scss" module>
.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;

	& del:not(:last-child) {
		margin-right: var(--spacing-4xs);
	}
}
</style>
