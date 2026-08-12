<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'UiIf' });

const props = withDefaults(defineProps<{ condition?: unknown; editing?: boolean }>(), {
	editing: false,
});

// Truthiness is JavaScript's, since the condition is an ordinary expression.
// The string forms are here because an unresolved expression arrives as text.
const truthy = computed(() => {
	const value = props.condition;
	if (value === 'false' || value === '') return false;
	return Boolean(value);
});

// In the canvas the subtree always renders: a hidden branch would be
// unselectable and so uneditable. Only the running app actually branches.
const show = computed(() => props.editing || truthy.value);
</script>

<template>
	<div v-if="show" class="ui-if">
		<slot />
	</div>
</template>

<style scoped>
.ui-if {
	display: contents;
}
</style>
