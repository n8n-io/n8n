<script setup lang="ts">
import { computed } from 'vue';
import type { AgentConfigValidationIssue } from '@n8n/api-types';
import { N8nButton, N8nToggle } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import AgentValidationTooltip from './AgentValidationTooltip.vue';

const props = withDefaults(
	defineProps<{
		isRunnable: boolean;
		isPreviewOpen?: boolean;
		iconOnly?: boolean;
		validationIssues?: AgentConfigValidationIssue[];
		testId?: string;
	}>(),
	{
		isPreviewOpen: false,
		iconOnly: false,
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
		:disabled="!isDisabled"
		:fallback="disabledTooltip"
		action="preview"
		:issues="props.validationIssues"
	>
		<N8nToggle
			v-if="props.iconOnly"
			:model-value="props.isPreviewOpen"
			variant="ghost"
			size="medium"
			icon="flask-conical"
			:label="label"
			:disabled="isDisabled"
			:data-testid="props.testId"
			@click="onClick"
		/>
		<N8nButton
			v-else
			variant="subtle"
			size="medium"
			icon="flask-conical"
			:label="label"
			:disabled="isDisabled"
			:data-testid="props.testId"
			@click="onClick"
		/>
	</AgentValidationTooltip>
</template>
