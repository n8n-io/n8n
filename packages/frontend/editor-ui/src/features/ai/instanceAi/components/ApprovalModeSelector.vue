<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { instanceAiApprovalModeSchema, type InstanceAiApprovalMode } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const props = defineProps<{
	/** The open thread, for telemetry. Absent on the new-chat screen. */
	threadId?: string;
}>();

type ModeItem = DropdownMenuItemProps<InstanceAiApprovalMode, { description: string }>;

const settingsStore = useInstanceAiSettingsStore();
const i18n = useI18n();
const telemetry = useTelemetry();

const open = ref(false);
const isTooltipSuppressed = ref(false);
let tooltipSuppressTimeout: ReturnType<typeof setTimeout> | undefined;

// A failed load hides the selector, so each new composer asks again.
onMounted(() => {
	void settingsStore.fetchPreferencesAfterFailure();
});

onBeforeUnmount(() => {
	clearTimeout(tooltipSuppressTimeout);
});

// Closing the menu returns focus to the trigger, which would show the tooltip at once.
watch(open, (isOpen, wasOpen) => {
	if (isOpen || !wasOpen) return;
	clearTimeout(tooltipSuppressTimeout);
	isTooltipSuppressed.value = true;
	tooltipSuppressTimeout = setTimeout(() => {
		isTooltipSuppressed.value = false;
	}, TOOLTIP_DELAY_MS + 100);
});

const items = computed<ModeItem[]>(() => [
	{
		id: 'manual',
		label: i18n.baseText('instanceAi.approvalMode.manual'),
		checkbox: true,
		checked: settingsStore.approvalMode === 'manual',
		data: { description: i18n.baseText('instanceAi.approvalMode.manual.description') },
	},
	{
		id: 'auto',
		label: i18n.baseText('instanceAi.approvalMode.auto'),
		checkbox: true,
		checked: settingsStore.approvalMode === 'auto',
		data: { description: i18n.baseText('instanceAi.approvalMode.auto.description') },
	},
]);

const currentLabel = computed(
	() => (items.value.find((item) => item.checked) ?? items.value[0]).label,
);

async function onSelect(value: unknown) {
	const mode = instanceAiApprovalModeSchema.safeParse(value);
	if (!mode.success) return;
	const previous = settingsStore.approvalMode;
	if (mode.data === previous) return;
	if (!(await settingsStore.setApprovalMode(mode.data))) return;
	telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_MODE_CHANGED, {
		mode: mode.data,
		previous_mode: previous,
		...(props.threadId ? { thread_id: props.threadId } : {}),
	});
}
</script>

<template>
	<div
		v-if="settingsStore.approvalModesAvailable"
		:class="$style.container"
		data-test-id="instance-ai-approval-mode-selector"
	>
		<N8nDropdownMenu
			v-model="open"
			:items="items"
			placement="top-start"
			width="320px"
			@select="onSelect"
		>
			<template #trigger>
				<N8nTooltip
					placement="top"
					as-child
					:content="i18n.baseText('instanceAi.approvalMode.tooltip')"
					:disabled="open || isTooltipSuppressed"
					:show-after="TOOLTIP_DELAY_MS"
				>
					<N8nButton
						variant="ghost"
						size="small"
						:class="$style.trigger"
						:aria-label="
							i18n.baseText('instanceAi.approvalMode.triggerLabel', {
								interpolate: { mode: currentLabel },
							})
						"
					>
						<span :class="$style.triggerLabel">{{ currentLabel }}</span>
						<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					</N8nButton>
				</N8nTooltip>
			</template>

			<template #item-label="{ item }">
				<span :class="$style.itemStack">
					<N8nText tag="span" size="medium">{{ item.label }}</N8nText>
					<N8nText tag="span" size="small" color="text-base">
						{{ item.data?.description }}
					</N8nText>
				</span>
			</template>
			<template #item-trailing="{ item }">
				<N8nIcon v-if="item.checked" icon="check" size="small" />
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: center;
}

.trigger {
	padding-inline: var(--spacing--3xs);
	height: var(--spacing--lg);
	gap: var(--spacing--4xs);
}

.triggerLabel {
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.itemStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	white-space: normal;
}
</style>
