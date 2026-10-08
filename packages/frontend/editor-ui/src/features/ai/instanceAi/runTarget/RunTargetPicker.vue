<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { LINKED_INSTANCES_SETTINGS_VIEW } from '@/features/linkedInstances/linkedInstances.constants';

import {
	LINK_CLOUD_MENU_ID,
	LOCAL_RUN_TARGET_ID,
	runTargetOptions,
	runTargetPlace,
	type RunTargetOption,
	type RunTargetTranslate,
} from './runTargetOptions';

type MenuItem = DropdownMenuItemProps<string, { description: string }>;

const props = defineProps<{ links: readonly LinkedInstanceSummary[] }>();
const model = defineModel<RunTarget>({ required: true });

const i18n = useI18n();
const router = useRouter();
const open = ref(false);

const translate: RunTargetTranslate = (key, params) =>
	i18n.baseText(key, params ? { interpolate: params } : undefined);

const options = computed(() => runTargetOptions(props.links, translate));
const place = computed(() => runTargetPlace(model.value, props.links, translate));
const selectedId = computed(() =>
	model.value.kind === 'linked' ? model.value.instanceId : LOCAL_RUN_TARGET_ID,
);
const triggerIcon = computed(() => (model.value.kind === 'linked' ? 'cloud' : 'laptop'));

const menuItems = computed<MenuItem[]>(() => [
	{
		id: 'run-target-header',
		label: i18n.baseText('instanceAi.runTarget.menuHeader'),
		header: true,
	},
	...options.value.map(toMenuItem),
	{
		id: LINK_CLOUD_MENU_ID,
		label: i18n.baseText('instanceAi.runTarget.linkCloud'),
		icon: { type: 'icon', value: 'plus' },
		divided: true,
	},
]);

function toMenuItem(option: RunTargetOption): MenuItem {
	return {
		id: option.id,
		label: option.label,
		disabled: option.disabled,
		checkbox: true,
		checked: option.id === selectedId.value,
		icon: { type: 'icon', value: option.target.kind === 'linked' ? 'cloud' : 'laptop' },
		data: { description: option.description },
	};
}

function selectTarget(id: string) {
	if (id === LINK_CLOUD_MENU_ID) {
		openLinkedInstances();
		return;
	}
	const option = options.value.find((candidate) => candidate.id === id);
	if (option && !option.disabled) model.value = option.target;
}

function openLinkedInstances() {
	open.value = false;
	void router.push({ name: LINKED_INSTANCES_SETTINGS_VIEW });
}
</script>

<template>
	<N8nDropdownMenu
		v-model="open"
		:items="menuItems"
		:extra-popper-class="$style.menu"
		placement="bottom-start"
		max-height="320px"
		width="320px"
		@select="selectTarget"
	>
		<template #trigger>
			<N8nButton
				variant="ghost"
				size="small"
				:class="$style.trigger"
				data-test-id="run-target-picker"
			>
				<template #icon>
					<N8nIcon :icon="triggerIcon" size="small" />
				</template>
				<span :class="$style.triggerLabel">
					{{ i18n.baseText('instanceAi.runTarget.trigger', { interpolate: { place } }) }}
				</span>
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
				data-test-id="run-target-selected"
			/>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.menu {
	min-width: 260px;
}

.trigger {
	max-width: 260px;
	padding-inline: var(--spacing--3xs);
	height: var(--spacing--lg);
	gap: var(--spacing--4xs);
	margin-inline-start: calc(var(--spacing--5xs) * -1);
}

.triggerLabel {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

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
