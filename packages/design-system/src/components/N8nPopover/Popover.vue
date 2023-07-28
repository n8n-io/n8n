<script lang="ts">
import { ElPopover } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nPopover',
	props: {
		...ElPopover.props,
	},
	components: {
		ElPopover,
	},
});
</script>

<template>
	<el-popover v-bind="{ ...$props, ...$attrs }">
		<template #reference>
			<slot name="reference" />
		</template>
		<slot />
	</el-popover>
</template>
