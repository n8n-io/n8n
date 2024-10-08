<script setup lang="ts">
import { ElPopover, type TooltipTriggerType, type Placement } from 'element-plus';
import type { StyleValue } from 'vue';

defineProps<{
	effect?: 'light' | 'dark';
	trigger?: TooltipTriggerType;
	placement?: Placement;
	popperClass?: string;
	popperStyle?: StyleValue;
	visible?: boolean;
	teleported?: boolean;
}>();
</script>

<template>
	<span>
		<ElPopover
			:effect="effect"
			:trigger="trigger"
			:placement="placement"
			:popper-class="popperClass"
			:popper-style="popperStyle"
			:visible="visible"
			:teleported="teleported"
		>
			<template #reference>
				<slot name="reference" />
			</template>
			<slot />
		</ElPopover>
	</span>
</template>
