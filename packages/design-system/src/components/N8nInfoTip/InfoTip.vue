<script lang="ts" setup>
import type { Placement } from 'element-plus';
import { computed } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

const THEME = ['info', 'info-light', 'warning', 'danger', 'success'] as const;
const TYPE = ['note', 'tooltip'] as const;

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

const iconData = computed((): { icon: string; color: string } => {
	switch (props.theme) {
		case 'info':
			return {
				icon: 'info-circle',
				color: '--color-text-light)',
			};
		case 'info-light':
			return {
				icon: 'info-circle',
				color: 'var(--color-foreground-dark)',
			};
		case 'warning':
			return {
				icon: 'exclamation-triangle',
				color: 'var(--color-warning)',
			};
		case 'danger':
			return {
				icon: 'exclamation-triangle',
				color: 'var(--color-danger)',
			};
		case 'success':
			return {
				icon: 'check-circle',
				color: 'var(--color-success)',
			};
		default:
			return {
				icon: 'info-circle',
				color: '--color-text-light)',
			};
	}
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
		<N8nTooltip
			v-if="type === 'tooltip'"
			:placement="tooltipPlacement"
			:popper-class="$style.tooltipPopper"
			:disabled="type !== 'tooltip'"
		>
			<span :class="$style.iconText" :style="{ color: iconData.color }">
				<N8nIcon :icon="iconData.icon" />
			</span>
			<template #content>
				<span>
					<slot />
				</span>
			</template>
		</N8nTooltip>
		<span v-else :class="$style.iconText">
			<N8nIcon :icon="iconData.icon" />
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
