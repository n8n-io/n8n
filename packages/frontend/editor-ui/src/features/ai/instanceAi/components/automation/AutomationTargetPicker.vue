<script setup lang="ts">
/**
 * "Change" on the place line of the automation card, in Power mode. The menu lists every place of
 * the card. A place that the card did not offer is disabled and says why.
 */
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AutomationTargetOption } from './automationTargets';

type MenuItem = DropdownMenuItemProps<string, { description: string }>;

const props = defineProps<{
	options: readonly AutomationTargetOption[];
	disabled?: boolean;
}>();
const model = defineModel<string | undefined>({ required: true });

const i18n = useI18n();
const open = ref(false);

const menuItems = computed<MenuItem[]>(() => [
	{
		id: 'automation-target-header',
		label: i18n.baseText('instanceAi.automation.place.menuHeader'),
		header: true,
	},
	...props.options.map(
		(option): MenuItem => ({
			id: option.id,
			label: option.label,
			disabled: option.disabled,
			checkbox: true,
			checked: option.id === model.value,
			icon: { type: 'icon', value: option.linked ? 'cloud' : 'laptop' },
			data: { description: option.description },
		}),
	),
]);

function selectTarget(id: string) {
	const option = props.options.find((candidate) => candidate.id === id);
	if (option && !option.disabled) model.value = option.id;
}
</script>

<template>
	<N8nDropdownMenu
		v-model="open"
		:items="menuItems"
		:disabled="disabled"
		placement="bottom-start"
		max-height="320px"
		width="300px"
		@select="selectTarget"
	>
		<template #trigger>
			<N8nButton
				variant="ghost"
				size="small"
				:disabled="disabled"
				:aria-label="i18n.baseText('instanceAi.automation.place.changeLabel')"
				data-test-id="automation-proposal-change-target"
			>
				{{ i18n.baseText('instanceAi.automation.place.change') }}
				<N8nIcon icon="chevron-down" size="small" :class="$style.trailingIcon" />
			</N8nButton>
		</template>

		<template #item-label="{ item, ui }">
			<span :class="[ui.class, $style.item]">
				<span :class="$style.itemName">{{ item.label }}</span>
				<span v-if="item.data?.description" :class="$style.itemHint">
					{{ item.data.description }}
				</span>
			</span>
		</template>

		<template #item-trailing="{ item }">
			<N8nIcon
				v-if="item.checked"
				icon="check"
				size="small"
				data-test-id="automation-proposal-target-selected"
			/>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.trailingIcon {
	flex-shrink: 0;
	color: var(--icon-color--subtle);
}

.item {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.itemName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemHint {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
</style>
