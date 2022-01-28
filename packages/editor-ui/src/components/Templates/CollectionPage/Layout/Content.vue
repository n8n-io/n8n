<template>
	<div>Collection Content</div>
</template>
<script lang="ts">
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	data() {
		return {
			loading: true,
		};
	},
	async mounted() {},
});
</script>
<style lang="scss" module>
</style>
