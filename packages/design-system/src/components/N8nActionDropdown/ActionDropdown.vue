<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<el-dropdown
			:placement="placement"
			:trigger="trigger"
			@command="onSelect"
			ref="elementDropdown"
		>
			<div :class="$style.activator" @click.prevent @blur="onButtonBlur">
				<n8n-icon :icon="activatorIcon" />
			</div>
			<template #dropdown>
				<el-dropdown-menu :class="$style.userActionsMenu">
					<el-dropdown-item
						v-for="item in items"
						:key="item.id"
						:command="item.id"
						:disabled="item.disabled"
						:divided="item.divided"
					>
						<div
							:class="{
								[$style.itemContainer]: true,
								[$style.hasCustomStyling]: item.customClass !== undefined,
								[item.customClass]: item.customClass !== undefined,
							}"
						>
							<span v-if="item.icon" :class="$style.icon">
								<n8n-icon :icon="item.icon" :size="iconSize" />
							</span>
							<span :class="$style.label">
								{{ item.label }}
							</span>
						</div>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import {
	Dropdown as ElDropdown,
	DropdownMenu as ElDropdownMenu,
	DropdownItem as ElDropdownItem,
} from 'element-ui';
import N8nIcon from '../N8nIcon';

interface IActionDropdownItem {
	id: string;
	label: string;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	customClass?: string;
}

// This component is visually similar to the ActionToggle component
// but it offers more options when it comes to dropdown items styling
// (supports icons, separators, custom styling and all options provided
// by Element UI dropdown component).
// It can be used in different parts of editor UI while ActionToggle
// is designed to be used in card components.
export default Vue.extend({
	name: 'n8n-action-dropdown',
	components: {
		ElDropdown,
		ElDropdownMenu,
		ElDropdownItem,
		N8nIcon,
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
		onSelect(action: string): void {
			this.$emit('select', action);
		},
		onButtonBlur(event: FocusEvent): void {
			const elementDropdown = this.$refs.elementDropdown as
				| (Vue & { hide: () => void })
				| undefined;
			// Hide dropdown when clicking outside of current document
			if (elementDropdown && event.relatedTarget === null) {
				elementDropdown.hide();
			}
		},
	},
});
</script>

<style lang="scss" module>
.activator {
	cursor: pointer;
	padding: var(--spacing-2xs);
	margin: 0;
	border-radius: var(--border-radius-base);
	line-height: normal !important;

	svg {
		position: static !important;
	}

	&:hover {
		background-color: var(--color-background-base);
		color: initial !important;
	}
}

.itemContainer {
	display: flex;
}

.icon {
	text-align: center;
	margin-right: var(--spacing-2xs);

	svg {
		width: 1.2em !important;
	}
}

:global(li.is-disabled) {
	.hasCustomStyling {
		color: inherit !important;
	}
}
</style>
