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
				<template #content>{{ nodeTypeName }}</template>
				<div v-if="type !== 'unknown'" :class="$style.icon">
					<img v-if="type === 'file'" :src="src" :class="$style.nodeIconImage" />
					<FontAwesomeIcon v-else :icon="`${name}`" :class="$style.iconFa" :style="fontStyleData" />
				</div>
				<div v-else :class="$style.nodeIconPlaceholder">
					{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
				</div>
			</N8nTooltip>
			<template v-else>
				<div v-if="type !== 'unknown'" :class="$style.icon">
					<img v-if="type === 'file'" :src="src" :class="$style.nodeIconImage" />
					<FontAwesomeIcon v-else :icon="`${name}`" :style="fontStyleData" />
					<div v-if="badge" :class="$style.badge" :style="badgeStyleData">
						<n8n-node-icon :type="badge.type" :src="badge.src" :size="badgeSize"></n8n-node-icon>
					</div>
				</div>
				<div v-else :class="$style.nodeIconPlaceholder">
					{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
				</div>
			</template>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import type { Placement } from 'element-plus';
import N8nTooltip from '../N8nTooltip';

interface NodeIconProps {
	type: 'file' | 'icon' | 'unknown';
	src?: string;
	name?: string;
	nodeTypeName?: string;
	size?: number;
	disabled?: boolean;
	circle?: boolean;
	color?: string;
	showTooltip?: boolean;
	tooltipPosition?: Placement;
	badge?: { src: string; type: string };
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

const badgeSize = computed((): number => {
	switch (props.size) {
		case 40:
			return 18;
		case 24:
			return 10;
		case 18:
		default:
			return 8;
	}
});

const fontStyleData = computed((): Record<string, string> => {
	if (!props.size) {
		return {};
	}

	return {
		'max-width': `${props.size}px`,
	};
});

const badgeStyleData = computed((): Record<string, string> => {
	const size = badgeSize.value;
	return {
		padding: `${Math.floor(size / 4)}px`,
		right: `-${Math.floor(size / 2)}px`,
		bottom: `-${Math.floor(size / 2)}px`,
	};
});
</script>

<style lang="scss" module>
.nodeIconWrapper {
	width: var(--node-icon-size, 26px);
	height: var(--node-icon-size, 26px);
	border-radius: var(--border-radius-small);
	color: var(--node-icon-color, #444);
	line-height: var(--node-icon-size, 26px);
	font-size: 1.1em;
	text-align: center;
	font-weight: bold;
	font-size: 20px;
}

.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;

	svg {
		max-width: 100%;
		max-height: 100%;
	}

	img,
	svg {
		pointer-events: none;
	}
}
.nodeIconPlaceholder {
	text-align: center;
}
.nodeIconImage {
	width: 100%;
	max-width: 100%;
	max-height: 100%;
}

.badge {
	position: absolute;
	background: var(--color-background-node-icon-badge, var(--color-background-base));
	border-radius: 50%;
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
