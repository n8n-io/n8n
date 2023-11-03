<template>
	<WorkerList />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import WorkerList from '@/components/WorkerList.ee.vue';

export default defineComponent({
	name: 'WorkerView',
	components: {
		WorkerList,
	},
});
</script>
