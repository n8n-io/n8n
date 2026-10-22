<script setup lang="ts">
import { computed } from 'vue';
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nButton } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import AgentValidationTooltip from './AgentValidationTooltip.vue';

const props = withDefaults(
	defineProps<{
		isRunnable: boolean;
		isPreviewOpen?: boolean;
		iconOnly?: boolean;
		variant?: 'outline' | 'ghost';
		validationIssues?: AgentConfigValidationIssue[];
		testId?: string;
	}>(),
	{
		isPreviewOpen: false,
		iconOnly: false,
		variant: 'outline',
		validationIssues: () => [],
		testId: undefined,
	},
);

const emit = defineEmits<{
	'open-preview': [];
	'close-preview': [];
}>();

const i18n = useI18n();
const isDisabled = computed(() => !props.isPreviewOpen && !props.isRunnable);
const label = computed(() =>
	props.isPreviewOpen
		? i18n.baseText('agents.builder.preview.close.ariaLabel' as BaseTextKey)
		: i18n.baseText('agents.builder.preview.button' as BaseTextKey),
);
const disabledTooltip = computed(() =>
	i18n.baseText('agents.builder.preview.disabledTooltip' as BaseTextKey),
);

function onClick() {
	if (props.isPreviewOpen) {
		emit('close-preview');
		return;
	}

	if (!isDisabled.value) emit('open-preview');
}
</script>

<template>
	<AgentValidationTooltip
		:disabled="!isDisabled && !props.iconOnly"
		:fallback="isDisabled ? disabledTooltip : label"
		action="preview"
		:issues="isDisabled ? props.validationIssues : []"
	>
		<N8nButton
			:variant="props.iconOnly ? 'outline' : props.variant"
			size="medium"
			icon="flask-conical"
			:label="props.iconOnly ? undefined : label"
			:aria-label="label"
			:icon-only="props.iconOnly"
			:aria-pressed="props.iconOnly ? props.isPreviewOpen : undefined"
			:data-state="props.iconOnly ? (props.isPreviewOpen ? 'on' : 'off') : undefined"
			:class="{ [$style.pressed]: props.iconOnly && props.isPreviewOpen }"
			:disabled="isDisabled"
			focusable-when-disabled
			:data-testid="props.testId"
			@click="onClick"
		/>
	</AgentValidationTooltip>
</template>

<style lang="scss" module>
.pressed[aria-pressed='true'] {
	background-color: var(--button--color--background-active);
	box-shadow:
		inset var(--button--border--shadow--active),
		var(--button--shadow--active);
}
</style>
