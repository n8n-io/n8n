<template>
	<component :is="tag" :class="['n8n-text', ...classes]" v-on="$listeners">
		<slot></slot>
	</component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
	name: 'n8n-text',
	props: {
		bold: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['xsmall', 'small', 'mini', 'medium', 'large', 'xlarge'].includes(value),
		},
		color: {
			type: String,
			validator: (value: string): boolean =>
				[
					'primary',
					'text-dark',
					'text-base',
					'text-light',
					'text-xlight',
					'danger',
					'success',
					'warning',
				].includes(value),
		},
		align: {
			type: String,
			validator: (value: string): boolean => ['right', 'left', 'center'].includes(value),
		},
		compact: {
			type: Boolean,
			default: false,
		},
		tag: {
			type: String,
			default: 'span',
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

			if (this.compact) {
				applied.push('compact');
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

.size-xlarge {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-xloose);
}

.size-large {
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}

.size-medium {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
}

.size-small {
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
}

.size-xsmall {
	font-size: var(--font-size-3xs);
	line-height: var(--font-line-height-compact);
}

.compact {
	line-height: 1;
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

.success {
	color: var(--color-success);
}

.warning {
	color: var(--color-warning);
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
