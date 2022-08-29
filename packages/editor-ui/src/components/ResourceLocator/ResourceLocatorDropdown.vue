<template>
	<el-popover
		placement="bottom"
		width="318"
		:popper-class="$style.popover"
		:value="true">
		<n8n-input>
			<font-awesome-icon icon="search" slot="prefix" />
		</n8n-input>
		<div v-for="result in resources" :key="result.value">
			{{ result.name }}
		</div>
		<slot slot="reference" />
	</el-popover>
</template>

<script lang="ts">
import { IResourceLocatorResult } from '@/Interface';
import Vue, { PropType } from 'vue';

export default Vue.extend({
	name: 'ResourceLocatorDropdown',
	props: {
		resources: {
			type: Array as PropType<IResourceLocatorResult[]>,
		},
	},
});
</script>

<style lang="scss" module>
.popover {
	padding: 0;
}
</style>
