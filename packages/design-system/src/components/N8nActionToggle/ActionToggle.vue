<template>
	<span :class="$style.container">
		<el-dropdown :placement="placement" trigger="click" @command="onCommand">
			<span :class="$style.button">
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
	</span>
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
			default: 'bottom',
			validator: (value: string): boolean =>
				['top', 'bottom'].includes(value),
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
.container > * {
	line-height: 1;
}

.button {
	cursor: pointer;
	padding: var(--spacing-4xs);
	border-radius: var(--border-radius-base);
	color: var(--color-text-dark);

	&:focus {
		background-color: var(--color-background-xlight);
	}
}
</style>
