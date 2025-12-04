<script setup lang="ts" generic="T extends string">
import { N8nActionDropdown, N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import type { ActionDropdownItem } from '@n8n/design-system/types';
import { type RouteLocationRaw } from 'vue-router';

const {
	active = false,
	to,
	label,
	menuItems = [],
	icon,
} = defineProps<{
	active?: boolean;
	to: RouteLocationRaw;
	label: string;
	menuItems?: Array<ActionDropdownItem<T>>;
	icon?: IconName;
}>();

const emit = defineEmits<{
	actionSelect: [action: T];
	click: [MouseEvent];
}>();

defineSlots<{
	default: unknown;
	icon: unknown;
}>();
</script>

<template>
	<div :class="[$style.menuItem, { [$style.active]: active }]">
		<slot v-if="$slots.default" />
		<template v-else>
			<RouterLink
				:to="to"
				:class="$style.menuItemLink"
				:title="label"
				@click="emit('click', $event)"
			>
				<slot name="icon">
					<N8nIcon v-if="icon" size="large" :icon="icon" />
				</slot>
				<N8nText :class="$style.label">{{ label }}</N8nText>
			</RouterLink>
			<N8nActionDropdown
				v-if="menuItems.length > 0"
				:items="menuItems"
				:class="$style.actionDropdown"
				placement="bottom-start"
				@select="emit('actionSelect', $event)"
				@click.stop
			>
				<template #activator>
					<N8nIconButton
						icon="ellipsis-vertical"
						type="tertiary"
						text
						:class="$style.actionDropdownTrigger"
					/>
				</template>
			</N8nActionDropdown>
		</template>
	</div>
</template>

<style lang="scss" module>
.menuItem {
	display: flex;
	align-items: center;
	border-radius: var(--spacing--4xs);
	padding-right: 0;

	&:focus-within,
	&:has([aria-expanded='true']),
	&.active,
	&:hover {
		background-color: var(--color--foreground);
	}
}

.menuItemLink {
	display: flex;
	align-items: center;
	padding: var(--spacing--3xs);
	gap: var(--spacing--3xs);
	cursor: pointer;
	color: var(--color--text);
	min-width: 0;
	flex: 1;
	text-decoration: none;
	outline: none;

	&:active {
		color: var(--color--text--shade-1);
	}
}

.label {
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;
	flex: 1;
	line-height: var(--font-size--lg);
	min-width: 0;
}

.actionDropdown {
	opacity: 0;
	transition: opacity 0.2s;
	flex-shrink: 0;
	width: 0;

	.menuItem:has([aria-expanded='true']) &,
	.menuItem:has(:focus) &,
	.menuItem:hover &,
	.active & {
		width: auto;
		opacity: 1;
	}
}

.actionDropdownTrigger {
	box-shadow: none !important;
	outline: none !important;
}
</style>
