<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

import type { TextAlign, TextColor, TextSize } from '../../types/text';

interface TextProps {
	bold?: boolean;
	size?: TextSize;
	color?: TextColor;
	align?: TextAlign;
	compact?: boolean;
	tag?: string;
}

defineOptions({ name: 'N8nText' });
const props = withDefaults(defineProps<TextProps>(), {
	bold: false,
	size: 'medium',
	compact: false,
	tag: 'span',
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

	if (props.compact) {
		applied.push('compact');
	}

	applied.push(`size-${props.size}`);
	applied.push(props.bold ? 'bold' : 'regular');

	return applied.map((c) => $style[c]);
});
</script>

<template>
	<component :is="tag" :class="['n8n-text', ...classes]" v-bind="$attrs">
		<slot></slot>
	</component>
</template>

<style lang="scss" module>
.bold {
	font-weight: var(--font-weight--medium);
}

.regular {
	font-weight: var(--font-weight--regular);
}

.size-xlarge {
	font-size: var(--font-size--xl);
	line-height: var(--line-height--xl);
}

.size-large {
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}

.size-medium {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
}

.size-small {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
}

.size-xsmall {
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--sm);
}

.compact {
	line-height: 1;
}

.primary {
	color: var(--color--primary);
}

.secondary {
	color: var(--color--secondary);
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
	color: var(--color--text--danger);
}

.success {
	color: var(--color--success);
}

.warning {
	color: var(--color--warning);
}

.foreground-dark {
	color: var(--color--foreground--shade-1);
}

.foreground-xdark {
	color: var(--color--foreground--shade-2);
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
