<template>
	<ExecutionsList />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ExecutionsList from '@/components/ExecutionsList.vue';

export default defineComponent({
	name: 'ExecutionsView',
	components: {
		ExecutionsList,
	},
});
</script>
