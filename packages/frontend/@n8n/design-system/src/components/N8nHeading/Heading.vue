<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

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

	applied.push(`size-${props.size}`);
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

.primary {
	color: var(--color--primary);
}

.text-dark {
	color: var(--color--text--shade-1);
}

.text-base {
	color: var(--color--text);
}

.text-light {
	color: var(--color--text--tint-1);
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
