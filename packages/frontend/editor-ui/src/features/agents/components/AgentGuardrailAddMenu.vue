<script setup lang="ts">
import type { AgentToolGuardrailKind } from '@n8n/api-types';
import { N8nButton, N8nDropdownMenu, N8nIcon, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useTemplateRef } from 'vue';
import { guardrailKindLabelKey, TOOL_GUARDRAIL_KINDS } from '@/features/agents/utils/guardrails';

const props = defineProps<{
	testId: string;
	iconOnly: boolean;
	disabled?: boolean;
}>();
const emit = defineEmits<{ select: [kind: AgentToolGuardrailKind] }>();

const i18n = useI18n();
const label = computed(() => i18n.baseText('agents.builder.guardrails.add'));
const items = computed(() =>
	TOOL_GUARDRAIL_KINDS.map((kind) => ({
		id: kind,
		label: i18n.baseText(guardrailKindLabelKey(kind)),
		testId: `${props.testId}-${kind}`,
	})),
);

const button = useTemplateRef<InstanceType<typeof N8nButton>>('button');
// Keep the same button anchor when the first pill changes the trigger to icon-only.
const anchor = computed(() => {
	const element: unknown = button.value?.$el;
	return element instanceof HTMLButtonElement ? element : undefined;
});
</script>

<template>
	<N8nDropdownMenu
		:items="items"
		:reference="anchor"
		:disabled="disabled"
		placement="bottom-start"
		:data-testid="`${testId}-menu`"
		@select="emit('select', $event)"
	>
		<template #trigger>
			<N8nTooltip as-child :content="label" :disabled="!iconOnly" placement="top">
				<N8nButton
					ref="button"
					:class="!iconOnly && $style.emptyAddButton"
					variant="ghost"
					:icon-only="iconOnly"
					:aria-label="label"
					:disabled="disabled"
					:data-testid="testId"
				>
					<template #icon>
						<N8nIcon icon="plus" :size="16" :color="iconOnly ? 'text-light' : undefined" />
					</template>
					<template v-if="!iconOnly">{{ label }}</template>
				</N8nButton>
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style module lang="scss">
.emptyAddButton {
	--button--color: var(--text-color--subtler);
	margin-left: calc(-1 * var(--spacing--xs));
	margin-top: calc(-1 * var(--spacing--4xs));

	&:hover {
		--button--color: var(--text-color);
		background-color: transparent;
	}
}
</style>
