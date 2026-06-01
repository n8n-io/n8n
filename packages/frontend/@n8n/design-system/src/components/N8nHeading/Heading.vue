<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import type { TextStep } from '../../types/text';

const SIZES = ['2xlarge', 'xlarge', 'large', 'medium', 'small'] as const;
const COLORS = [
	'primary',
	'text-dark',
	'text-base',
	'text-light',
	'text-xlight',
	'danger',
] as const;
const ALIGN = ['right', 'left', 'center'] as const;

interface HeadingProps {
	tag?: string;
	bold?: boolean;
	size?: (typeof SIZES)[number];
	step?: TextStep;
	color?: (typeof COLORS)[number];
	align?: (typeof ALIGN)[number];
}

defineOptions({ name: 'N8nHeading' });
const props = withDefaults(defineProps<HeadingProps>(), {
	tag: 'span',
	bold: false,
	size: 'medium',
});

const $style = useCssModule();
const classes = computed(() => {
	const applied: string[] = [];
	if (props.align) {
		applied.push(`align-${props.align}`);
	}
	if (props.color) {
		applied.push(props.color);
	}

	if (props.step) {
		applied.push(`step-${props.step}`);
	} else {
		applied.push(`size-${props.size}`);
	}
	applied.push(props.bold ? 'bold' : 'regular');

	return applied.map((c) => $style[c]);
});
</script>

<template>
	<component :is="tag" :class="['n8n-heading', ...classes]" v-bind="$attrs">
		<slot></slot>
	</component>
</template>

<style lang="scss" module>
.bold {
	font-weight: var(--font-weight--bold);
}

.regular {
	font-weight: var(--font-weight--regular);
}

.size-2xlarge {
	font-size: var(--font-size--2xl);
	line-height: var(--line-height--sm);
}

.size-xlarge {
	font-size: var(--font-size--xl);
	line-height: var(--line-height--sm);
}

.size-large {
	font-size: var(--font-size--lg);
	line-height: var(--line-height--lg);
}

.size-medium {
	font-size: var(--font-size--md);
	line-height: var(--line-height--lg);
}

.size-small {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.step-4xs {
	font-size: var(--font-size--4xs);
	line-height: var(--line-height--xs);
	letter-spacing: var(--letter-spacing--normal);
}

.step-3xs {
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--sm);
	letter-spacing: var(--letter-spacing--normal);
}

.step-2xs {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	letter-spacing: var(--letter-spacing--normal);
}

.step-xs {
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	letter-spacing: var(--letter-spacing--normal);
}

.step-sm {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	letter-spacing: var(--letter-spacing--normal);
}

.step-md {
	font-size: var(--font-size--md);
	line-height: var(--line-height--lg);
	letter-spacing: var(--letter-spacing--normal);
}

.step-lg {
	font-size: var(--font-size--lg);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--normal);
}

.step-xl {
	font-size: var(--font-size--xl);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--normal);
}

.step-2xl {
	font-size: var(--font-size--2xl);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--tight);
}

.primary {
	color: var(--color--primary);
}

.text-dark {
	color: var(--text-color);
}

.text-base {
	color: var(--text-color--subtle);
}

.text-light {
	color: var(--text-color--subtler);
}

.text-xlight {
	color: var(--color--text--tint-3);
}

.danger {
	color: var(--color--danger);
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
