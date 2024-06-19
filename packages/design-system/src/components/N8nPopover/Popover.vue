<script setup lang="ts">
import { ElPopover, type PopoverProps } from 'element-plus';

// eslint-disable-next-line vue/prop-name-casing
defineProps<PopoverProps>();
defineOptions({ name: 'N8nPopover' });
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
