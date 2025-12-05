<script setup lang="ts" generic="T = string">
import {
	DropdownMenuRoot,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
} from 'reka-ui';
import { computed, ref, watch, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';
import N8nLoading from '@n8n/design-system/v2/components/Loading/Loading.vue';

import type { DropdownMenuProps, DropdownMenuSlots } from './DropdownMenu.types';
import N8nDropdownMenuItem from './DropdownMenuItem.vue';

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DropdownMenuProps<T>>(), {
	placement: 'bottom',
	trigger: 'click',
	activatorIcon: 'ellipsis',
	disabled: false,
	teleported: true,
	hideArrow: false,
	loading: false,
	loadingItemCount: 3,
});

const emit = defineEmits<{
	'update:modelValue': [open: boolean];
	select: [value: T];
}>();

const slots = defineSlots<DropdownMenuSlots<T>>();

const $style = useCssModule();

// Handle controlled/uncontrolled state
const internalOpen = ref(props.defaultOpen ?? false);

// Determine if we're in controlled mode (modelValue is explicitly passed)
const isControlled = computed(() => props.modelValue !== undefined);

// Watch for external modelValue changes in controlled mode
watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== undefined) {
			internalOpen.value = newValue;
		}
	},
	{ immediate: true },
);

// Pass undefined when uncontrolled to let Reka UI manage its own state
const openState = computed(() => (isControlled.value ? internalOpen.value : undefined));

// Convert placement to Reka UI side + align
type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end' | 'center';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

const isSide = (value: string): value is Side => VALID_SIDES.includes(value as Side);
const isAlign = (value: string): value is Align => VALID_ALIGNS.includes(value as Align);

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'bottom',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

const contentStyle = computed(() => {
	if (props.maxHeight) {
		const maxHeightValue =
			typeof props.maxHeight === 'number' ? `${props.maxHeight}px` : props.maxHeight;
		return { maxHeight: maxHeightValue, overflowY: 'auto' as const };
	}
	return {};
});

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:modelValue', open);
};

const handleItemSelect = (value: T) => {
	emit('select', value);
};

// Expose methods for programmatic control
const open = () => {
	internalOpen.value = true;
	emit('update:modelValue', true);
};

const close = () => {
	internalOpen.value = false;
	emit('update:modelValue', false);
};

defineExpose({ open, close });
</script>

<template>
	<DropdownMenuRoot :open="openState" @update:open="handleOpenChange">
		<!-- Use as-child only when custom trigger slot is provided -->
		<DropdownMenuTrigger v-if="slots.trigger" as-child :disabled="disabled">
			<slot name="trigger" />
		</DropdownMenuTrigger>
		<!-- Default trigger without as-child for proper attribute forwarding -->
		<DropdownMenuTrigger v-else :class="$style.activator" :disabled="disabled">
			<Icon :icon="activatorIcon" />
		</DropdownMenuTrigger>

		<component :is="teleported ? DropdownMenuPortal : 'template'">
			<DropdownMenuContent
				:id="id"
				ref="content"
				:class="[$style.content, extraPopperClass]"
				:side="placementParts.side"
				:align="placementParts.align"
				:side-offset="5"
				:style="contentStyle"
			>
				<slot v-if="slots.content" name="content" />
				<template v-else-if="loading">
					<slot name="loading">
						<div :class="$style.loadingContainer">
							<N8nLoading
								v-for="i in loadingItemCount"
								:key="i"
								variant="p"
								:rows="1"
								:class="$style.loadingItem"
							/>
						</div>
					</slot>
				</template>
				<template v-else>
					<template v-for="item in items" :key="item.id">
						<slot name="item" :item="item">
							<N8nDropdownMenuItem v-bind="item" @select="handleItemSelect">
								<template #item-leading="{ ui }">
									<slot name="item-leading" :item="item" :ui="ui">
										<Icon v-if="item.icon" :icon="item.icon" :class="ui.class" />
									</slot>
								</template>
								<template #item-label>
									<slot name="item-label" :item="item">
										{{ item.label }}
									</slot>
								</template>
								<template #item-trailing="{ ui }">
									<slot name="item-trailing" :item="item" :ui="ui" />
								</template>
							</N8nDropdownMenuItem>
						</slot>
					</template>
				</template>

				<Icon v-if="!hideArrow" icon="chevron-up" :class="$style.arrow" />
			</DropdownMenuContent>
		</component>
	</DropdownMenuRoot>
</template>

<style module>
.activator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 30px;
	height: 30px;
	padding: 0;
	border: none;
	border-radius: var(--radius);
	background-color: transparent;
	color: var(--color--text);
	cursor: pointer;
	outline: none;

	&:hover {
		background-color: var(--color--background);
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px var(--color--primary);
	}

	&[data-disabled] {
		color: var(--color--text--tint-1);
		cursor: not-allowed;
	}
}

.content {
	min-width: 160px;
	padding: var(--spacing--4xs);
	border-radius: var(--radius);
	border: var(--border);
	background-color: var(--color--background--light-2);
	box-shadow: var(--shadow);
	/**
	 * High z-index to ensure dropdown is above other elements
	 * TODO: Replace with design system z-index variable when available
	 */
	z-index: 999999;
}

.arrow {
	position: absolute;
	top: -8px;
	left: 50%;
	transform: translateX(-50%);
	color: var(--color--background--light-2);
	filter: drop-shadow(0 -1px 0 var(--color--foreground));

	/* Hide by default, shown based on hideArrow prop */
	display: none;
}

.loadingContainer {
	padding: var(--spacing--4xs);
}

.loadingItem {
	margin-bottom: var(--spacing--4xs);

	&:last-child {
		margin-bottom: 0;
	}
}
</style>
