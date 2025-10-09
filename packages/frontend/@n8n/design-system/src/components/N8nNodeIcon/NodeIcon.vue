<script lang="ts" setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import type { Placement } from 'element-plus';
import { computed, getCurrentInstance } from 'vue';

import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import { isSupportedIconName } from '../N8nIcon/icons';
import N8nTooltip from '../N8nTooltip';

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
	// temporarily until we roll out FA icons for all nodes
	useUpdatedIcons?: boolean;
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
			return 12;
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

const updatedIconName = computed((): IconName | undefined => {
	return props.useUpdatedIcons && isSupportedIconName(props.name) ? props.name : undefined;
});

// Get self component to avoid dependency cycle
const N8nNodeIcon = getCurrentInstance()?.type;
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
					<N8nIcon
						v-else-if="updatedIconName"
						:icon="updatedIconName"
						:style="fontStyleData"
						size="xlarge"
					/>
					<FontAwesomeIcon v-else :icon="`${name}`" :style="fontStyleData" />
					<div v-if="badge" :class="$style.badge" :style="badgeStyleData">
						<N8nNodeIcon :type="badge.type" :src="badge.src" :size="badgeSize" />
					</div>
				</div>
				<div v-else :class="$style.nodeIconPlaceholder">
					{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.nodeIconWrapper {
	width: var(--node-icon-size, 26px);
	height: var(--node-icon-size, 26px);
	border-radius: var(--border-radius-small);
	color: var(--node-icon-color, #444);
	line-height: var(--node-icon-size, 26px);
	font-size: 1.1em;
	text-align: center;
	font-weight: var(--font-weight-bold);
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
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
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
