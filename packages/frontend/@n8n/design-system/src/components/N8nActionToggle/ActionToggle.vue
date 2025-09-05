<script lang="ts" setup generic="UserType extends IUser, Actions extends UserAction<UserType>[]">
import { ElDropdown, ElDropdownMenu, ElDropdownItem, type Placement } from 'element-plus';
import { ref } from 'vue';

import type { IUser, UserAction } from '@n8n/design-system/types';
import type { IconOrientation, IconSize } from '@n8n/design-system/types/icon';

import N8nIcon from '../N8nIcon';
import N8nLoading from '../N8nLoading';

const SIZE = ['mini', 'small', 'medium'] as const;
const THEME = ['default', 'dark'] as const;

interface ActionToggleProps<UserType extends IUser, Actions extends Array<UserAction<UserType>>> {
	actions?: Actions;
	placement?: Placement;
	size?: (typeof SIZE)[number];
	iconSize?: IconSize;
	theme?: (typeof THEME)[number];
	iconOrientation?: IconOrientation;
	loading?: boolean;
	loadingRowCount?: number;
	disabled?: boolean;
	popperClass?: string;
	trigger?: 'click' | 'hover';
}

type ActionValue = Actions[number]['value'];

defineOptions({ name: 'N8nActionToggle' });
withDefaults(defineProps<ActionToggleProps<UserType, Array<UserAction<UserType>>>>(), {
	actions: () => [],
	placement: 'bottom',
	size: 'medium',
	theme: 'default',
	iconSize: 'medium',
	iconOrientation: 'vertical',
	loading: false,
	loadingRowCount: 3,
	disabled: false,
	popperClass: '',
	trigger: 'click',
});

const actionToggleRef = ref<InstanceType<typeof ElDropdown> | null>(null);

const emit = defineEmits<{
	action: [value: ActionValue];
	'visible-change': [value: boolean];
	'item-mouseup': [action: UserAction<UserType>];
}>();

const onCommand = (value: string) => emit('action', value);
const onVisibleChange = (value: boolean) => emit('visible-change', value);
const openActionToggle = (isOpen: boolean) => {
	if (isOpen) {
		actionToggleRef.value?.handleOpen();
	} else {
		actionToggleRef.value?.handleClose();
	}
};

const onActionMouseUp = (action: UserAction<UserType>) => {
	emit('item-mouseup', action);
	actionToggleRef.value?.handleClose();
};

defineExpose({
	openActionToggle,
});
</script>

<template>
	<span
		:class="['action-toggle', $style.container]"
		data-test-id="action-toggle"
		@click.stop.prevent
	>
		<ElDropdown
			ref="actionToggleRef"
			:placement="placement"
			:size="size"
			:disabled="disabled"
			:popper-class="popperClass"
			:trigger="trigger"
			@command="onCommand"
			@visible-change="onVisibleChange"
		>
			<slot>
				<span :class="{ [$style.button]: true, [$style[theme]]: !!theme }">
					<N8nIcon
						:icon="iconOrientation === 'horizontal' ? 'ellipsis' : 'ellipsis-vertical'"
						:size="iconSize"
					/>
				</span>
			</slot>

			<template #dropdown>
				<ElDropdownMenu
					v-if="loading"
					:class="$style['loading-dropdown']"
					data-test-id="action-toggle-loading-dropdown"
				>
					<ElDropdownItem v-for="index in loadingRowCount" :key="index" :disabled="true">
						<template #default>
							<N8nLoading :class="$style.loading" animated variant="text" />
						</template>
					</ElDropdownItem>
				</ElDropdownMenu>
				<ElDropdownMenu v-else data-test-id="action-toggle-dropdown">
					<ElDropdownItem
						v-for="action in actions"
						:key="action.value"
						:command="action.value"
						:disabled="action.disabled"
						:data-test-id="`action-${action.value}`"
						@mouseup="onActionMouseUp(action)"
					>
						{{ action.label }}
						<div :class="$style.iconContainer">
							<N8nIcon
								v-if="action.type === 'external-link'"
								icon="external-link"
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

.loading-dropdown {
	display: flex;
	flex-direction: column;
	padding: var(--spacing-xs) 0;
	gap: var(--spacing-2xs);
}

.loading {
	display: flex;
	width: 100%;
	min-width: var(--spacing-3xl);
}
</style>
