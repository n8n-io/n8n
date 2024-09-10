<script lang="ts" setup>
import { computed } from 'vue';
import type { Placement } from 'element-plus';
import N8nIcon from '../N8nIcon';

const THEME = ['info', 'info-light', 'warning', 'danger', 'success'] as const;

interface InfoTipProps {
	theme?: (typeof THEME)[number];
	bold?: boolean;
	tooltipPlacement?: Placement;
}

defineOptions({ name: 'N8nInfoTip' });
const props = withDefaults(defineProps<InfoTipProps>(), {
	theme: 'info',
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
			[$style.note]: true,
			[$style.infoTip]: true,
			[$style[theme]]: true,
			[$style.bold]: bold,
		}"
	>
		<span :class="$style.iconText">
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

.iconText {
	display: inline-flex;
	align-items: flex-start;
}
</style>
