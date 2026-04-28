<script lang="ts" setup generic="T extends string | number">
import type { IconSize } from '../../types/icon';
import N8nIcon from '../N8nIcon';

const SIZE = ['mini', 'small', 'medium'] as const;
const THEME = ['default', 'dark'] as const;
const ICON_ORIENTATION = ['horizontal', 'vertical'] as const;

export interface N8nActionToggleAction<V = string | number> {
	label: string;
	value: V;
	disabled?: boolean;
	type?: 'external-link';
}

interface ActionToggleProps<T extends string | number> {
	actions?: Array<N8nActionToggleAction<T>>;
	placement?:
		| 'top'
		| 'top-start'
		| 'top-end'
		| 'bottom'
		| 'bottom-start'
		| 'bottom-end'
		| 'left'
		| 'left-start'
		| 'left-end'
		| 'right'
		| 'right-start'
		| 'right-end';
	size?: (typeof SIZE)[number];
	iconSize?: IconSize;
	theme?: (typeof THEME)[number];
	iconOrientation?: (typeof ICON_ORIENTATION)[number];
	loading?: boolean;
	loadingRowCount?: number;
}

type ActionValue = T;

defineOptions({ name: 'N8nActionToggle' });

const props = withDefaults(defineProps<ActionToggleProps<T>>(), {
	actions: () => [],
	placement: 'bottom',
	size: 'medium',
	theme: 'default',
	iconSize: 'medium',
	iconOrientation: 'vertical',
	loading: false,
	loadingRowCount: 3,
});

const emit = defineEmits<{
	action: [value: ActionValue];
	'visible-change': [value: boolean];
}>();

const handleAction = (value: ActionValue) => {
	emit('action', value);
};

const handleVisibleChange = (value: boolean) => {
	emit('visible-change', value);
};
</script>

<template>
	<div data-test-id="action-toggle" :class="$style.container">
		<slot>
			<span :class="{ [$style.button]: true, [$style[theme]]: !!theme }">
				<N8nIcon
					:icon="iconOrientation === 'horizontal' ? 'ellipsis' : 'ellipsis-vertical'"
					:size="iconSize"
				/>
			</span>
		</slot>
		<!--
			@deprecated Use N8nDropdown instead. This component will be removed in a future version.
			Example migration:
			<N8nActionToggle :actions="actions" @action="onAction" />
			becomes:
			<N8nDropdown :actions="actions" @action="onAction" />
		--></div>
</template>

<style lang="scss" module>
.container > * {
	line-height: 1;
}

.button {
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	display: flex;
	align-items: center;

	&:hover {
		color: var(--color--primary);
		cursor: pointer;
	}

	&:focus {
		color: var(--color--primary);
	}
}

.dark {
	color: var(--color--text--shade-1);

	&:focus {
		background-color: var(--color--background--light-3);
	}
}
</style>
