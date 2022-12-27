<template>
	<page-view-layout>
		<template>
			<ExecutionsList />
		</template>
	</page-view-layout>
</template>

<script lang="ts">
import Vue from 'vue';
import PageViewLayout from '@/components/layouts/PageViewLayout.vue';
import ExecutionsList from '@/components/ExecutionsList.vue';

export default Vue.extend({
	name: 'ExecutionsView',
	components: {
		PageViewLayout,
		ExecutionsList,
	},
});
</script>
