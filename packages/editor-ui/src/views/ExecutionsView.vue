<template>
	<ExecutionsList />
</template>

<script lang="ts">
import Vue from 'vue';
import ExecutionsList from '@/components/ExecutionsList.vue';

export default Vue.extend({
	name: 'ExecutionsView',
	components: {
		ExecutionsList,
	},
});
</script>
