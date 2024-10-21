<script lang="ts" setup>
import type { Placement } from 'element-plus';
import { computed } from 'vue';

import type { IconColor } from 'n8n-design-system/types/icon';

import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

const THEME = ['info', 'info-light', 'warning', 'danger', 'success'] as const;
const TYPE = ['note', 'tooltip'] as const;

const ICON_MAP = {
	info: 'info-circle',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'info-light': 'info-circle',
	warning: 'exclamation-triangle',
	danger: 'exclamation-triangle',
	success: 'check-circle',
} as const;
type IconMap = typeof ICON_MAP;

interface InfoTipProps {
	theme?: (typeof THEME)[number];
	type?: (typeof TYPE)[number];
	bold?: boolean;
	tooltipPlacement?: Placement;
}

defineOptions({ name: 'N8nInfoTip' });
const props = withDefaults(defineProps<InfoTipProps>(), {
	theme: 'info',
	type: 'note',
	bold: true,
	tooltipPlacement: 'top',
});

const iconData = computed<{ icon: IconMap[keyof IconMap]; color: IconColor }>(() => {
	return {
		icon: ICON_MAP[props.theme],
		color: props.theme === 'info' || props.theme === 'info-light' ? 'text-base' : props.theme,
	} as const;
});
</script>

<template>
	<div
		:class="{
			'n8n-info-tip': true,
			[$style.infoTip]: true,
			[$style[theme]]: true,
			[$style[type]]: true,
			[$style.bold]: bold,
		}"
	>
		<!-- Note that the branching is required to support displaying
		 the slot either in the tooltip of the icon or following it -->
		<N8nTooltip
			v-if="type === 'tooltip'"
			:placement="tooltipPlacement"
			:popper-class="$style.tooltipPopper"
			:disabled="type !== 'tooltip'"
		>
			<span :class="$style.iconText">
				<N8nIcon :icon="iconData.icon" :color="iconData.color" />
			</span>
			<template #content>
				<span>
					<slot />
				</span>
			</template>
		</N8nTooltip>
		<span v-else :class="$style.iconText">
			<N8nIcon :icon="iconData.icon" :color="iconData.color" />
			<span>
				<slot />
			</span>
		</span>
	</div>
</template>

<style lang="scss" module>
.infoTip {
	display: flex;
}

.base {
	font-size: var(--font-size-2xs);
	line-height: var(--font-size-s);
	word-break: normal;
	display: flex;
	align-items: center;

	svg {
		font-size: var(--font-size-s);
	}
}

.bold {
	font-weight: var(--font-weight-bold);
}

.note {
	composes: base;

	svg {
		margin-right: var(--spacing-4xs);
	}
}

.tooltipPopper {
	composes: base;
	display: inline-flex;
}

.iconText {
	display: inline-flex;
	align-items: flex-start;
}
</style>
