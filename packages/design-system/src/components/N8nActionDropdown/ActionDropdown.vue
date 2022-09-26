<template>
	<div :class="['action-dropdown-container', $style.actionDropdownContainer]">
		<el-dropdown :placement="placement" :trigger="trigger" @command="onSelect">
			<div :class="$style.activator">
				<n8n-icon :icon="activatorIcon"/>
			</div>
			<el-dropdown-menu slot="dropdown" :class="$style.userActionsMenu">
				<el-dropdown-item
					v-for="item in items"
					:key="item.id"
					:command="item.id"
					:disabled="item.disabled"
					:divided="item.divided"
				>
					<div :class="{
						[$style.itemContainer]: true,
						[$style.hasCustomStyling]: item.customClass !== undefined,
						[item.customClass]: item.customClass !== undefined,
					}">
						<span v-if="item.icon" :class="$style.icon">
							<n8n-icon :icon="item.icon"/>
						</span>
						<span :class="$style.label">
							{{ item.label }}
						</span>
					</div>
				</el-dropdown-item>
			</el-dropdown-menu>
		</el-dropdown>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import ElDropdown from 'element-ui/lib/dropdown';
import ElDropdownMenu from 'element-ui/lib/dropdown-menu';
import ElDropdownItem from 'element-ui/lib/dropdown-item';
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
		ElDropdownMenu, // eslint-disable-line @typescript-eslint/no-unsafe-assignment
		ElDropdown,		// eslint-disable-line @typescript-eslint/no-unsafe-assignment
		ElDropdownItem,	// eslint-disable-line @typescript-eslint/no-unsafe-assignment
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
		trigger: {
			type: String,
			default: 'click',
			validator: (value: string): boolean =>
				['click', 'hover'].includes(value),
		},
	},
	methods: {
		onSelect(action: string) : void {
			this.$emit('select', action);
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

	svg { width: 1.2em !important; }
}

:global(li.is-disabled) {
	.hasCustomStyling {
		color: inherit !important;
	}
}

</style>
