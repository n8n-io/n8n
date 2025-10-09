<script lang="ts" setup>
import type { RouteLocationRaw } from 'vue-router';

import type { TextSize } from '../../types/text';
import N8nRoute from '../N8nRoute';
import N8nText from '../N8nText';

const THEME = ['primary', 'danger', 'text', 'secondary'] as const;

interface LinkProps {
	to?: RouteLocationRaw | string;
	size?: TextSize;
	newWindow?: boolean;
	bold?: boolean;
	underline?: boolean;
	theme?: (typeof THEME)[number];
	title?: string;
}

defineOptions({ name: 'N8nLink' });
withDefaults(defineProps<LinkProps>(), {
	to: undefined,
	size: undefined,
	bold: false,
	underline: false,
	theme: 'primary',
});
</script>

<template>
	<N8nRoute :to="to" :title="title" :new-window="newWindow" v-bind="$attrs" class="n8n-link">
		<span :class="$style[`${underline ? `${theme}-underline` : theme}`]">
			<N8nText :size="size" :bold="bold">
				<slot></slot>
			</N8nText>
		</span>
	</N8nRoute>
</template>

<style lang="scss" module>
@use '../../utils';
@use '../../css/common/var';

.primary {
	color: var.$link-color;

	&:active {
		color: var.$link-color-active;
	}
}

.text {
	color: var(--color--text);

	&:hover {
		color: var.$link-color;
	}

	&:active {
		color: var.$link-color-active;
	}
}

.danger {
	color: var(--color--danger);

	&:active {
		color: var(--color--danger--shade-1);
	}
}

.secondary {
	color: var(--color-secondary-link);

	&:active {
		color: var(--color-secondary-link-hover);
	}
}

.primary-underline {
	composes: primary;
	text-decoration: underline;
}

.text-underline {
	composes: text;
	text-decoration: underline;
}

.danger-underline {
	composes: danger;
	text-decoration: underline;
}

.secondary-underline {
	composes: secondary;
	text-decoration: underline;
}
</style>
