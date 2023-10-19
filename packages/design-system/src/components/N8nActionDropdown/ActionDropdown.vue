<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<el-dropdown
			:placement="placement"
			:trigger="trigger"
			@command="onSelect"
			@visible-change="onVisibleChange"
			ref="elementDropdown"
		>
			<n8n-icon-button
				@click.stop.prevent
				@blur="onButtonBlur"
				type="tertiary"
				text
				:icon="activatorIcon"
			/>

			<template #dropdown>
				<el-dropdown-menu :class="$style.userActionsMenu">
					<el-dropdown-item
						v-for="item in items"
						:key="item.id"
						:command="item.id"
						:disabled="item.disabled"
						:divided="item.divided"
						:class="$style.elementItem"
					>
						<div :class="getItemClasses(item)" :data-test-id="`${testIdPrefix}-item-${item.id}`">
							<span v-if="item.icon" :class="$style.icon">
								<n8n-icon :icon="item.icon" :size="iconSize" />
							</span>
							<span :class="$style.label">
								{{ item.label }}
							</span>
							<n8n-keyboard-shortcut
								v-if="item.shortcut"
								v-bind="item.shortcut"
								:class="$style.shortcut"
							>
							</n8n-keyboard-shortcut>
						</div>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
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
	name: 'n8n-action-dropdown',
	components: {
		ElDropdown,
		ElDropdownMenu,
		ElDropdownItem,
		N8nIcon,
		N8nKeyboardShortcut,
	},
	data() {
		const testIdPrefix = this.$attrs['data-test-id'];
		return { testIdPrefix };
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
			default: 'ellipsis-v',
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
	},
	methods: {
		getItemClasses(item: IActionDropdownItem): Record<string, boolean> {
			return {
				[this.$style.itemContainer]: true,
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
	},
});
</script>

<style lang="scss" module>
.userActionsMenu {
	min-width: 160px;
	padding: var(--spacing-4xs) 0;
}

.elementItem {
	padding: 0;

	&:hover {
		color: inherit;
	}
}

.activator {
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	margin: 0;
	border-radius: var(--border-radius-base);
	line-height: normal !important;

	svg {
		position: static !important;
	}

	&:hover {
		background-color: var(--color-background-base);
		color: var(--color-primary);
	}
}

.itemContainer {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	justify-content: space-between;
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-xloose);
	padding: var(--spacing-4xs) var(--spacing-2xs);

	&:hover {
		background-color: var(--color-background-base);
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
	color: var(--color-text-lighter);

	.hasCustomStyling {
		color: inherit !important;
	}
}
</style>
