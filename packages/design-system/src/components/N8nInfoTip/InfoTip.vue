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

<script lang="ts">
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

import { defineComponent } from 'vue';

export default defineComponent({
	name: 'N8nInfoTip',
	components: {
		N8nIcon,
		N8nTooltip,
	},
	props: {
		theme: {
			type: String,
			default: 'info',
			validator: (value: string): boolean =>
				['info', 'info-light', 'warning', 'danger', 'success'].includes(value),
		},
		type: {
			type: String,
			default: 'note',
			validator: (value: string): boolean => ['note', 'tooltip'].includes(value),
		},
		bold: {
			type: Boolean,
			default: true,
		},
		tooltipPlacement: {
			type: String,
			default: 'top',
		},
	},
	computed: {
		iconData(): { icon: string; color: string } {
			switch (this.theme) {
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
		},
	},
});
</script>

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
