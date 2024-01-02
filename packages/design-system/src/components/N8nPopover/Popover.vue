<script lang="ts">
import { ElPopover } from 'element-plus';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nPopover',
	components: {
		ElPopover,
	},
	props: {
		...ElPopover.props,
	},
});
</script>

<template>
	<span>
		<ElPopover v-bind="{ ...$props, ...$attrs }">
			<template #reference>
				<slot name="reference" />
			</template>
			<slot />
		</ElPopover>
	</span>
</template>
