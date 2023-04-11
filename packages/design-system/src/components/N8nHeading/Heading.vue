<template>
	<component :is="tag" :class="['n8n-heading', ...classes]" v-on="$listeners">
		<slot></slot>
	</component>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-heading',
	props: {
		tag: {
			type: String,
			default: 'span',
		},
		bold: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['2xlarge', 'xlarge', 'large', 'medium', 'small'].includes(value),
		},
		color: {
			type: String,
			validator: (value: string): boolean =>
				['primary', 'text-dark', 'text-base', 'text-light', 'text-xlight', 'danger'].includes(
					value,
				),
		},
		align: {
			type: String,
			validator: (value: string): boolean => ['right', 'left', 'center'].includes(value),
		},
	},
	computed: {
		classes() {
			const applied = [];
			if (this.align) {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				applied.push(`align-${this.align}`);
			}
			if (this.color) {
				applied.push(this.color);
			}

			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			applied.push(`size-${this.size}`);

			applied.push(this.bold ? 'bold' : 'regular');

			return applied.map((c) => this.$style[c]);
		},
	},
});
</script>

<style lang="scss" module>
.bold {
	font-weight: var(--font-weight-bold);
}

.regular {
	font-weight: var(--font-weight-regular);
}

.size-2xlarge {
	font-size: var(--font-size-2xl);
	line-height: var(--font-line-height-compact);
}

.size-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-compact);
}

.size-large {
	font-size: var(--font-size-l);
	line-height: var(--font-line-height-loose);
}

.size-medium {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-loose);
}

.size-small {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
}

.primary {
	color: var(--color-primary);
}

.text-dark {
	color: var(--color-text-dark);
}

.text-base {
	color: var(--color-text-base);
}

.text-light {
	color: var(--color-text-light);
}

.text-xlight {
	color: var(--color-text-xlight);
}

.danger {
	color: var(--color-danger);
}

.align-left {
	text-align: left;
}

.align-right {
	text-align: right;
}

.align-center {
	text-align: center;
}
</style>
