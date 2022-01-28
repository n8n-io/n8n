<template>
	<div>
		<div>Collection Page</div>
	</div>
</template>
<script lang="ts">
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(workflowHelpers).extend({
	name: 'CollectionHeader',
	data() {
		return {
			loading: false,
		};
	},
});
</script>
<style lang="scss" module>
</style>
