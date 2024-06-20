<template>
	<span :class="$style.container" data-test-id="action-toggle" @click.stop.prevent>
		<ElDropdown
			:placement="placement"
			:size="size"
			trigger="click"
			@command="onCommand"
			@visible-change="onVisibleChange"
		>
			<slot>
				<span :class="{ [$style.button]: true, [$style[theme]]: !!theme }">
					<N8nIcon
						:icon="iconOrientation === 'horizontal' ? 'ellipsis-h' : 'ellipsis-v'"
						:size="iconSize"
					/>
				</span>
			</slot>

			<template #dropdown>
				<ElDropdownMenu data-test-id="action-toggle-dropdown">
					<ElDropdownItem
						v-for="action in actions"
						:key="action.value"
						:command="action.value"
						:disabled="action.disabled"
						:data-test-id="`action-${action.value}`"
					>
						{{ action.label }}
						<div :class="$style.iconContainer">
							<N8nIcon
								v-if="action.type === 'external-link'"
								icon="external-link-alt"
								size="xsmall"
								color="text-base"
							/>
						</div>
					</ElDropdownItem>
				</ElDropdownMenu>
			</template>
		</ElDropdown>
	</span>
</template>

<script lang="ts" setup>
import { ElDropdown, ElDropdownMenu, ElDropdownItem, type Placement } from 'element-plus';
import type { UserAction } from 'n8n-design-system/types';
import N8nIcon from '../N8nIcon';
import type { IconOrientation, IconSize } from 'n8n-design-system/types/icon';

const SIZE = ['mini', 'small', 'medium'] as const;
const THEME = ['default', 'dark'] as const;

interface ActionToggleProps {
	actions?: UserAction[];
	placement?: Placement;
	size?: (typeof SIZE)[number];
	iconSize?: IconSize;
	theme?: (typeof THEME)[number];
	iconOrientation?: IconOrientation;
}

defineOptions({ name: 'N8nActionToggle' });
withDefaults(defineProps<ActionToggleProps>(), {
	actions: () => [],
	placement: 'bottom',
	size: 'medium',
	theme: 'default',
	iconOrientation: 'vertical',
});

const $emit = defineEmits(['action', 'visible-change']);
const onCommand = (value: string) => $emit('action', value);
const onVisibleChange = (value: boolean) => $emit('visible-change', value);
</script>

<style lang="scss" module>
.container > * {
	line-height: 1;
}

.button {
	cursor: pointer;
	padding: var(--spacing-4xs);
	border-radius: var(--border-radius-base);

	&:hover {
		color: var(--color-primary);
		cursor: pointer;
	}

	&:focus {
		color: var(--color-primary);
	}
}

.dark {
	color: var(--color-text-dark);

	&:focus {
		background-color: var(--color-background-xlight);
	}
}

.iconContainer {
	display: inline;
}

li:hover .iconContainer svg {
	color: var(--color-primary-tint-1);
}
</style>
