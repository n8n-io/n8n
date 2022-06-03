<template>
	<div :class="classes" role="alert">
		<div :class="$style.icon">
			<n8n-icon v-bind="$attrs" :icon="getIcon" size="large"/>
		</div>
		<div :class="$style.message" >
			<n8n-text size="small" v-bind="$attrs"><span v-html="message"></span></n8n-text>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export default Vue.extend({
	name: 'n8n-callout',
	components: {
		N8nIcon,
		N8nText
	},
	props: {
		theme: {
			type: String,
			required: true,
			validator: (value: string): boolean =>
				['info', 'success', 'warning', 'danger', 'custom'].includes(value),
		},
		message: {
			type: String,
			required: true
		},
		icon: {
			type: String,
			default: 'info-circle'
		}
	},
	data() {
		return {
			defaultIcons: {
				'info': 'info-circle',
				'success': 'check-circle',
				'warning': 'exclamation-triangle',
				'danger': 'times-circle',
			}
		}
	},
	computed: {
		classes(): string[] {
			return [
				this.$style['callout'],
				this.$style[this.theme],
			];
		},
		getIcon(): string {
			if(this.theme === 'custom') {
				return this.icon;
			}
			return this.defaultIcons[this.theme];
		},
	}
});
</script>

<style lang="scss" module>
	.callout {
		display: flex;
		font-size: var(--font-size-2xs);
		padding: var(--spacing-xs);
		border: var(--border-width-base) var(--border-style-base);
		border-radius: var(--border-radius-base);
		align-items: center;
	}

	.info, .custom {
		border-color: var(--color-foreground-base);
		background-color: var(--color-background-light);
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
		margin-right: var(--spacing-xs);
	}
</style>
