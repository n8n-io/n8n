<script lang="ts" setup>
import ToolDataBlock from '@/features/ai/shared/components/ToolDataBlock/ToolDataBlock.vue';

defineProps<{
	value: unknown;
}>();
</script>

<template>
	<ToolDataBlock :value="value" :class="$style.json" />
</template>

<style lang="scss" module>
.json {
	margin-top: var(--spacing--2xs);
	max-width: 90%;

	& + & {
		margin-top: var(--spacing--4xs);
	}
}
</style>
