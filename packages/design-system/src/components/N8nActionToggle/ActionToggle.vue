<template>
	<span :class="$style.container">
		<el-dropdown :placement="placement" :size="size" trigger="click" @command="onCommand" @visible-change="onVisibleChange">
			<span :class="{[$style.button]: true, [$style[theme]]: !!theme}">
				<component :is="$options.components.N8nIcon"
					icon="ellipsis-v"
					:size="iconSize"
				/>
			</span>
			<el-dropdown-menu slot="dropdown">
				<el-dropdown-item
					v-for="action in actions"
					:key="action.value"
					:command="action.value"
					:disabled="action.disabled"
				>
					{{action.label}}
					<div :class="$style.iconContainer">
						<component
							v-if="action.type === 'external-link'"
							:is="$options.components.N8nIcon"
							icon="external-link-alt"
							size="xsmall"
							color="text-base"
						/>
					</div>
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
				['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start'].includes(value),
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['mini', 'small', 'medium'].includes(value),
		},
		iconSize: {
			type: String,
		},
		theme: {
			type: String,
			default: 'default',
			validator: (value: string): boolean =>
				['default', 'dark'].includes(value),
		},
	},
	methods: {
		onCommand(value: string) {
			this.$emit('action', value);
		},
		onVisibleChange(value: boolean) {
			this.$emit('visible-change', value);
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
