<script lang="ts">
import type { BaseTextKey } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';

type EmptyStateConfig = {
	icon: IconName;
	headingKey: BaseTextKey;
	descriptionKey: BaseTextKey;
	// Reuses the header create-button i18n keys so the labels can't drift
	ctaKey: BaseTextKey;
	disabledTooltipKey: BaseTextKey;
};

export const EMPTY_STATE_CONFIG = {
	workflows: {
		icon: 'workflow',
		headingKey: 'workflows.empty.list.heading',
		descriptionKey: 'workflows.empty.list.description',
		ctaKey: 'projects.header.create.workflow',
		disabledTooltipKey: 'workflows.empty.button.disabled.tooltip',
	},
	credentials: {
		icon: 'key-round',
		headingKey: 'credentials.empty.heading',
		descriptionKey: 'credentials.empty.description',
		ctaKey: 'projects.header.create.credential',
		disabledTooltipKey: 'credentials.empty.button.disabled.tooltip',
	},
	variables: {
		icon: 'variable',
		headingKey: 'variables.empty.heading',
		descriptionKey: 'variables.empty.description',
		ctaKey: 'variables.add.button.label',
		disabledTooltipKey: 'variables.empty.button.disabled.tooltip',
	},
	dataTable: {
		icon: 'database',
		headingKey: 'dataTable.empty.heading',
		descriptionKey: 'dataTable.empty.description',
		ctaKey: 'dataTable.add.button.label',
		disabledTooltipKey: 'dataTable.empty.button.disabled.tooltip',
	},
	agents: {
		icon: 'robot',
		headingKey: 'agents.list.empty.heading',
		descriptionKey: 'agents.list.empty.description',
		ctaKey: 'projects.header.create.agent',
		disabledTooltipKey: 'agents.list.empty.button.disabled.tooltip',
	},
} as const satisfies Record<string, EmptyStateConfig>;

export type EmptyStateResourceKey = keyof typeof EMPTY_STATE_CONFIG;

export function isEmptyStateResourceKey(key: string): key is EmptyStateResourceKey {
	return key in EMPTY_STATE_CONFIG;
}
</script>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nActionBox } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		resourceKey: EmptyStateResourceKey;
		buttonDisabled?: boolean;
		disabledTooltipText?: string;
	}>(),
	{ buttonDisabled: false, disabledTooltipText: undefined },
);

const emit = defineEmits<{ 'click:button': [event: Event] }>();

const i18n = useI18n();

const config = computed(() => EMPTY_STATE_CONFIG[props.resourceKey]);
const tooltipText = computed(
	() => props.disabledTooltipText ?? i18n.baseText(config.value.disabledTooltipKey),
);
</script>

<template>
	<N8nActionBox
		data-test-id="empty-resources-list"
		:icon="{ type: 'icon', value: config.icon }"
		:heading="i18n.baseText(config.headingKey)"
		:description="i18n.baseText(config.descriptionKey)"
		:button-text="i18n.baseText(config.ctaKey)"
		:button-disabled="buttonDisabled"
		:button-icon="buttonDisabled ? 'lock' : undefined"
		@click:button="emit('click:button', $event)"
	>
		<template #disabledButtonTooltip>{{ tooltipText }}</template>
	</N8nActionBox>
</template>
