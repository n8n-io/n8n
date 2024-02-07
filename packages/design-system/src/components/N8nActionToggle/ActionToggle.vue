<template>
	<span :class="$style.container" data-test-id="action-toggle" @click.stop.prevent>
		<ElDropdown
			:placement="placement"
			:size="size"
			trigger="click"
			@command="onCommand"
			@visible-change="onVisibleChange"
		>
			<slot>
				<span :class="{ [$style.button]: true, [$style[theme]]: !!theme }">
					<N8nIcon
						:icon="iconOrientation === 'horizontal' ? 'ellipsis-h' : 'ellipsis-v'"
						:size="iconSize"
					/>
				</span>
			</slot>

			<template #dropdown>
				<ElDropdownMenu data-test-id="action-toggle-dropdown">
					<ElDropdownItem
						v-for="action in actions"
						:key="action.value"
						:command="action.value"
						:disabled="action.disabled"
						:data-test-id="`action-${action.value}`"
					>
						{{ action.label }}
						<div :class="$style.iconContainer">
							<N8nIcon
								v-if="action.type === 'external-link'"
								icon="external-link-alt"
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

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus';
import N8nIcon from '../N8nIcon';
import type { UserAction } from '@/types';

export default defineComponent({
	name: 'N8nActionToggle',
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
