<script lang="ts" setup>
import type { Placement } from 'element-plus';
import { computed } from 'vue';

import N8nTooltip from '../N8nTooltip';
import IconContent from './IconContent.vue';

type IconType = 'file' | 'icon' | 'unknown';

interface NodeIconProps {
	type: IconType;
	src?: string;
	name?: string;
	nodeTypeName?: string;
	size?: number;
	disabled?: boolean;
	circle?: boolean;
	color?: string;
	showTooltip?: boolean;
	tooltipPosition?: Placement;
	badge?: { src: string; type: IconType };
}

const props = withDefaults(defineProps<NodeIconProps>(), {
	tooltipPosition: 'top',
});

const iconStyleData = computed((): Record<string, string> => {
	if (!props.size) {
		return {
			color: props.color || '',
		};
	}

	return {
		color: props.color || '',
		width: `${props.size}px`,
		height: `${props.size}px`,
		'font-size': `${props.size}px`,
		'line-height': `${props.size}px`,
	};
});
</script>

<template>
	<div class="n8n-node-icon" v-bind="$attrs">
		<div
			:class="{
				[$style.nodeIconWrapper]: true,
				[$style.circle]: circle,
				[$style.disabled]: disabled,
			}"
			:style="iconStyleData"
		>
			<!-- ElementUI tooltip is prone to memory-leaking so we only render it if we really need it -->
			<N8nTooltip v-if="showTooltip" :placement="tooltipPosition" :disabled="!showTooltip">
				<template #content>
					{{ nodeTypeName }}
				</template>
				<IconContent
					:type="type"
					:src="src"
					:name="name"
					:node-type-name="nodeTypeName"
					:size="size"
					:badge="badge"
				/>
			</N8nTooltip>
			<IconContent
				v-else
				:type="type"
				:src="src"
				:name="name"
				:node-type-name="nodeTypeName"
				:size="size"
				:badge="badge"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.nodeIconWrapper {
	width: var(--node-icon-size, 26px);
	height: var(--node-icon-size, 26px);
	border-radius: var(--radius--sm);
	color: var(--node-icon-color, #444);
	line-height: var(--node-icon-size, 26px);
	font-size: 1.1em;
	text-align: center;
	font-weight: var(--font-weight--bold);
	font-size: 20px;
}

.circle {
	border-radius: 50%;
}

.disabled {
	color: '#ccc';
	-webkit-filter: contrast(40%) brightness(1.5) grayscale(100%);
	filter: contrast(40%) brightness(1.5) grayscale(100%);
}
</style>
