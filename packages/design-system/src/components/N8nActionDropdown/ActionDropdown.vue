<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<ElDropdown
			ref="elementDropdown"
			:placement="placement"
			:trigger="trigger"
			:popper-class="{ [$style.shadow]: true, [$style.hideArrow]: hideArrow }"
			@command="onSelect"
			@visible-change="onVisibleChange"
		>
			<slot v-if="$slots.activator" name="activator" />
			<n8n-icon-button
				v-else
				type="tertiary"
				text
				:class="$style.activator"
				:size="activatorSize"
				:icon="activatorIcon"
				@blur="onButtonBlur"
			/>

			<template #dropdown>
				<ElDropdownMenu :class="$style.userActionsMenu">
					<ElDropdownItem
						v-for="item in items"
						:key="item.id"
						:command="item.id"
						:disabled="item.disabled"
						:divided="item.divided"
						:class="$style.elementItem"
					>
						<div :class="getItemClasses(item)" :data-test-id="`${testIdPrefix}-item-${item.id}`">
							<span v-if="item.icon" :class="$style.icon">
								<N8nIcon :icon="item.icon" :size="iconSize" />
							</span>
							<span :class="$style.label">
								{{ item.label }}
							</span>
							<N8nKeyboardShortcut
								v-if="item.shortcut"
								v-bind="item.shortcut"
								:class="$style.shortcut"
							>
							</N8nKeyboardShortcut>
						</div>
					</ElDropdownItem>
				</ElDropdownMenu>
			</template>
		</ElDropdown>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import N8nIcon from '../N8nIcon';
import { N8nKeyboardShortcut } from '../N8nKeyboardShortcut';
import type { KeyboardShortcut } from '../../types';

export interface IActionDropdownItem {
	id: string;
	label: string;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
}

// This component is visually similar to the ActionToggle component
// but it offers more options when it comes to dropdown items styling
// (supports icons, separators, custom styling and all options provided
// by Element UI dropdown component).
// It can be used in different parts of editor UI while ActionToggle
// is designed to be used in card components.
export default defineComponent({
	name: 'N8nActionDropdown',
	components: {
		ElDropdown,
		ElDropdownMenu,
		ElDropdownItem,
		N8nIcon,
		N8nKeyboardShortcut,
	},
	props: {
		items: {
			type: Array as PropType<IActionDropdownItem[]>,
			required: true,
		},
		placement: {
			type: String,
			default: 'bottom',
			validator: (value: string): boolean =>
				['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'].includes(value),
		},
		activatorIcon: {
			type: String,
			default: 'ellipsis-h',
		},
		activatorSize: {
			type: String,
			default: 'medium',
		},
		iconSize: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean => ['small', 'medium', 'large'].includes(value),
		},
		trigger: {
			type: String,
			default: 'click',
			validator: (value: string): boolean => ['click', 'hover'].includes(value),
		},
		hideArrow: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		const testIdPrefix = this.$attrs['data-test-id'];
		return { testIdPrefix };
	},
	methods: {
		getItemClasses(item: IActionDropdownItem): Record<string, boolean> {
			return {
				[this.$style.itemContainer]: true,
				[this.$style.disabled]: item.disabled,
				[this.$style.hasCustomStyling]: item.customClass !== undefined,
				...(item.customClass !== undefined ? { [item.customClass]: true } : {}),
			};
		},
		onSelect(action: string): void {
			this.$emit('select', action);
		},
		onVisibleChange(open: boolean): void {
			this.$emit('visibleChange', open);
		},
		onButtonBlur(event: FocusEvent): void {
			const elementDropdown = this.$refs.elementDropdown as InstanceType<typeof ElDropdown>;

			// Hide dropdown when clicking outside of current document
			if (elementDropdown?.handleClose && event.relatedTarget === null) {
				elementDropdown.handleClose();
			}
		},
		open() {
			const elementDropdown = this.$refs.elementDropdown as InstanceType<typeof ElDropdown>;
			elementDropdown.handleOpen();
		},
		close() {
			const elementDropdown = this.$refs.elementDropdown as InstanceType<typeof ElDropdown>;
			elementDropdown.handleClose();
		},
	},
});
</script>

<style lang="scss" module>
:global(.el-dropdown__list) {
	.userActionsMenu {
		min-width: 160px;
		padding: var(--spacing-4xs) 0;
	}

	.elementItem {
		padding: 0;
	}
}

:global(.el-popper).hideArrow {
	:global(.el-popper__arrow) {
		display: none;
	}
}

.shadow {
	box-shadow: var(--box-shadow-light);
}

.activator {
	&:hover {
		background-color: var(--color-background-base);
	}
}

.itemContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-s);
	justify-content: space-between;
	font-size: var(--font-size-2xs);
	line-height: 18px;
	padding: var(--spacing-3xs) var(--spacing-2xs);

	&.disabled {
		.shortcut {
			opacity: 0.3;
		}
	}
}

.icon {
	text-align: center;
	margin-right: var(--spacing-2xs);

	svg {
		width: 1.2em !important;
	}
}

.shortcut {
	display: flex;
}

:global(li.is-disabled) {
	.hasCustomStyling {
		color: inherit !important;
	}
}
</style>
