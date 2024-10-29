<script lang="ts" setup>
/**
 * Component that splits the given text by new lines and renders
 * each line in a separate span element joined by a line break.
 */
import { computed } from 'vue';

const props = defineProps<{
	text: string;
}>();

const lines = computed(() => {
	return props.text ? props.text.split('\n') : [];
});
</script>

<template>
	<div>
		<span v-for="(line, index) in lines" :key="index">
			{{ line }}<br v-if="index < lines.length - 1" />
		</span>
	</div>
</template>
