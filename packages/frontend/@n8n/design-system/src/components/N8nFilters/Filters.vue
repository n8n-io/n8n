<script lang="ts" setup>
import ChipFilters from './ChipFilters.vue';
import N8nDropdownFilters from './DropdownFilters.vue';

defineProps<{ type: 'chip' | 'dropdown' }>();
</script>

<template>
	<N8nDropdownFilters v-if="type === 'dropdown'" />
	<ChipFilters v-else />
</template>
