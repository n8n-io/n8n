<template>
	<el-dropdown :placement="placement" trigger="click" @command="onCommand">
		<a :class="$style.button">
			<component :is="$options.components.N8nIcon"
				icon="ellipsis-v"
			/>
		</a>
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
	height: var(--spacing-xl);
	width: var(--spacing-l);
	display: inline-flex;
	border-radius: var(--border-radius-base);
	align-items: center;
	justify-content: center;
	color: var(--color-text-dark);

	&:focus {
		background-color: var(--color-background-xlight);
	}
}
</style>
