<template>
	<span :class="$style.container" data-test-id="action-toggle">
		<el-dropdown
			:placement="placement"
			:size="size"
			trigger="click"
			@click.native.stop
			@command="onCommand"
			@visible-change="onVisibleChange"
		>
			<span :class="{ [$style.button]: true, [$style[theme]]: !!theme }">
				<n8n-icon
					:icon="iconOrientation === 'horizontal' ? 'ellipsis-h' : 'ellipsis-v'"
					:size="iconSize"
				/>
			</span>

			<template #dropdown>
				<el-dropdown-menu data-test-id="action-toggle-dropdown">
					<el-dropdown-item
						v-for="action in actions"
						:key="action.value"
						:command="action.value"
						:disabled="action.disabled"
					>
						{{ action.label }}
						<div :class="$style.iconContainer">
							<n8n-icon
								v-if="action.type === 'external-link'"
								icon="external-link-alt"
								size="xsmall"
								color="text-base"
							/>
						</div>
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</span>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import {
	Dropdown as ElDropdown,
	DropdownMenu as ElDropdownMenu,
	DropdownItem as ElDropdownItem,
} from 'element-ui';
import N8nIcon from '../N8nIcon';
import type { UserAction } from '@/types';

export default defineComponent({
	name: 'n8n-action-toggle',
	components: {
		ElDropdown,
		ElDropdownMenu,
		ElDropdownItem,
		N8nIcon,
	},
	props: {
		actions: {
			type: Array as PropType<UserAction[]>,
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
			validator: (value: string): boolean => ['mini', 'small', 'medium'].includes(value),
		},
		iconSize: {
			type: String,
		},
		theme: {
			type: String,
			default: 'default',
			validator: (value: string): boolean => ['default', 'dark'].includes(value),
		},
		iconOrientation: {
			type: String,
			default: 'vertical',
			validator: (value: string): boolean => ['horizontal', 'vertical'].includes(value),
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
});
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
