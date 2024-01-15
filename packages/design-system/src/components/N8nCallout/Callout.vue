<template>
	<div :class="classes" role="alert">
		<div :class="$style.messageSection">
			<div v-if="!iconless" :class="$style.icon">
				<N8nIcon :icon="getIcon" :size="getIconSize" />
			</div>
			<N8nText size="small">
				<slot />
			</N8nText>
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
	danger: 'exclamation-triangle',
};

export default defineComponent({
	name: 'N8nCallout',
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
	border-color: var(--color-callout-info-border);
	background-color: var(--color-callout-info-background);
	color: var(--color-callout-info-font);

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
	border-color: var(--color-callout-info-border);
	background-color: var(--color-callout-info-background);
	color: var(--color-callout-info-font);

	.icon {
		color: var(--color-callout-info-icon);
	}
}

.success {
	border-color: var(--color-callout-success-border);
	background-color: var(--color-callout-success-background);
	color: var(--color-callout-success-font);

	.icon {
		color: var(--color-callout-success-icon);
	}
}

.warning {
	border-color: var(--color-callout-warning-border);
	background-color: var(--color-callout-warning-background);
	color: var(--color-callout-warning-font);

	.icon {
		color: var(--color-callout-warning-icon);
	}
}

.danger {
	border-color: var(--color-callout-danger-border);
	background-color: var(--color-callout-danger-background);
	color: var(--color-callout-danger-font);

	.icon {
		color: var(--color-callout-danger-icon);
	}
}

.icon {
	line-height: 1;
	margin-right: var(--spacing-2xs);
}

.secondary {
	font-size: var(--font-size-2xs);
	font-weight: var(--font-weight-bold);
	border-color: var(--color-callout-secondary-border);
	background-color: var(--color-callout-secondary-background);
	color: var(--color-callout-secondary-font);

	.icon {
		color: var(--color-callout-secondary-icon);
	}
}
</style>
