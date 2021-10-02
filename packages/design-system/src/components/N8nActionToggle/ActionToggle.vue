<template>
	<el-dropdown :placement="placement" trigger="click" @command="onCommand">
		<span :class="focusHighlight ? $style.focusButton : $style.button">
			<component :is="$options.components.N8nIcon"
				icon="ellipsis-v"
			/>
		</span>
		<el-dropdown-menu slot="dropdown">
			<el-dropdown-item
				v-for="action in actions"
				:key="action.value"
				:command="action.value"
			>
				{{action.label}}
			</el-dropdown-item>
		</el-dropdown-menu>
	</el-dropdown>
</template>

<script lang="ts">
import ElDropdown from 'element-ui/lib/dropdown';
import ElDropdownMenu from 'element-ui/lib/dropdown-menu';
import ElDropdownItem from 'element-ui/lib/dropdown-item';
import N8nIcon from '../N8nIcon';

export default {
	name: 'n8n-action-toggle',
	components: {
		ElDropdown,
		ElDropdownMenu,
		ElDropdownItem,
		N8nIcon,
	},
	props: {
		actions: {
			type: Array,
			default: () => [],
		},
		placement: {
			type: String,
			default: 'bottom-end',
		},
		focusHighlight: {
			type: Boolean,
			default: true,
		},
	},
	methods: {
		onCommand(value: string) {
			this.$emit('action', value)	;
		},
	},
};
</script>

<style lang="scss" module>
.button {
	padding: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	color: var(--color-text-dark);
}

.focusButton {
	composes: button;

	&:focus {
		background-color: var(--color-background-xlight);
	}
}
</style>
