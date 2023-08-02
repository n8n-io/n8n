<template>
	<div :class="classes" role="alert">
		<div :class="$style.messageSection">
			<div :class="$style.icon" v-if="!iconless">
				<n8n-icon :icon="getIcon" :size="getIconSize" />
			</div>
			<n8n-text size="small">
				<slot />
			</n8n-text>
			&nbsp;
			<slot name="actions" />
		</div>

		<slot name="trailingContent" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import N8nText from '../N8nText';
import N8nIcon from '../N8nIcon';

const CALLOUT_DEFAULT_ICONS: { [key: string]: string } = {
	info: 'info-circle',
	success: 'check-circle',
	warning: 'exclamation-triangle',
	danger: 'times-circle',
};

export default defineComponent({
	name: 'n8n-callout',
	components: {
		N8nText,
		N8nIcon,
	},
	props: {
		theme: {
			type: String,
			required: true,
			validator: (value: string): boolean =>
				['info', 'success', 'secondary', 'warning', 'danger', 'custom'].includes(value),
		},
		icon: {
			type: String,
		},
		iconSize: {
			type: String,
			default: 'medium',
		},
		iconless: {
			type: Boolean,
		},
		slim: {
			type: Boolean,
		},
		roundCorners: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		classes(): string[] {
			return [
				'n8n-callout',
				this.$style.callout,
				this.$style[this.theme],
				this.slim ? this.$style.slim : '',
				this.roundCorners ? this.$style.round : '',
			];
		},
		getIcon(): string {
			return this.icon ?? CALLOUT_DEFAULT_ICONS?.[this.theme] ?? CALLOUT_DEFAULT_ICONS.info;
		},
		getIconSize(): string {
			if (this.iconSize) {
				return this.iconSize;
			}
			if (this.theme === 'secondary') {
				return 'medium';
			}
			return 'large';
		},
	},
});
</script>

<style lang="scss" module>
.callout {
	display: flex;
	justify-content: space-between;
	font-size: var(--font-size-2xs);
	padding: var(--spacing-xs);
	border: var(--border-width-base) var(--border-style-base);
	align-items: center;
	line-height: var(--font-line-height-loose);

	&.slim {
		line-height: var(--font-line-height-loose);
		padding: var(--spacing-3xs) var(--spacing-2xs);
	}
}

.round {
	border-radius: var(--border-radius-base);
}

.messageSection {
	display: flex;
	align-items: center;
}

.info,
.custom {
	border-color: var(--color-foreground-base);
	background-color: var(--color-foreground-xlight);
	color: var(--color-info);
}

.warning {
	border-color: var(--color-warning-tint-1);
	background-color: var(--color-warning-tint-2);
	color: var(--color-warning);
}

.success {
	border-color: var(--color-success-tint-1);
	background-color: var(--color-success-tint-2);
	color: var(--color-success);
}

.danger {
	border-color: var(--color-danger-tint-1);
	background-color: var(--color-danger-tint-2);
	color: var(--color-danger);
}

.icon {
	line-height: 1;
	margin-right: var(--spacing-2xs);
}

.secondary {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	color: var(--color-secondary);
	background-color: var(--color-secondary-tint-3);
	border-color: var(--color-secondary-tint-1);
}
</style>
