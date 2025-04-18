<script setup lang="ts">
import { ElPopover, popoverProps } from 'element-plus';

defineProps({
	...popoverProps,
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
