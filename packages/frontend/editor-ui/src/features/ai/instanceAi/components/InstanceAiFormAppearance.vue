<script lang="ts" setup>
/**
 * HITL confirmation card for the Instance AI `forms` apply-theme action. Shows a
 * read-only rendered preview of the proposed appearance plus Approve/Deny,
 * translating the choice into instance AI's confirm transport
 * (`thread.confirmAction` + `thread.resolveConfirmation`).
 */
import { computed, ref } from 'vue';
import { N8nButton, N8nCard, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiFormAppearance } from '@n8n/api-types';

import { useThread } from '../instanceAi.store';
import InstanceAiFormPreview from './InstanceAiFormPreview.vue';

const props = defineProps<{
	requestId: string;
	formAppearance: InstanceAiFormAppearance;
}>();

const i18n = useI18n();
const thread = useThread();

const MAX_CONFIRM_ATTEMPTS = 2;
const submitted = ref(false);

const isResolvedOrSubmitted = computed(
	() => submitted.value || thread.resolvedConfirmationIds.has(props.requestId),
);

const scopeLabel = computed(() =>
	props.formAppearance.scope === 'workflow'
		? i18n.baseText('instanceAi.formAppearance.scope.workflow')
		: i18n.baseText('instanceAi.formAppearance.scope.node', {
				interpolate: { nodeName: props.formAppearance.nodeName ?? '' },
			}),
);

async function resolve(approved: boolean) {
	if (isResolvedOrSubmitted.value) return;
	submitted.value = true;

	const resolution = approved ? 'approved' : 'denied';
	for (let attempt = 0; attempt < MAX_CONFIRM_ATTEMPTS; attempt++) {
		if (await thread.confirmAction(props.requestId, { kind: 'approval', approved })) break;
	}
	thread.resolveConfirmation(props.requestId, resolution);
}
</script>

<template>
	<N8nCard v-if="!submitted" :class="$style.card" data-test-id="instance-ai-form-appearance">
		<div :class="$style.header">
			<N8nText bold>{{ i18n.baseText('instanceAi.formAppearance.title') }}</N8nText>
			<N8nText size="small" color="text-light">
				{{
					formAppearance.themeLabel
						? i18n.baseText('instanceAi.formAppearance.summary', {
								interpolate: { theme: formAppearance.themeLabel, scope: scopeLabel },
							})
						: scopeLabel
				}}
			</N8nText>
		</div>

		<InstanceAiFormPreview :preview-html="formAppearance.previewHtml" />

		<div :class="$style.actions">
			<N8nButton
				variant="outline"
				size="small"
				:disabled="isResolvedOrSubmitted"
				data-test-id="instance-ai-form-appearance-deny"
				@click="resolve(false)"
			>
				{{ i18n.baseText('instanceAi.confirmation.deny') }}
			</N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				:disabled="isResolvedOrSubmitted"
				data-test-id="instance-ai-form-appearance-approve"
				@click="resolve(true)"
			>
				{{ i18n.baseText('instanceAi.confirmation.approve') }}
			</N8nButton>
		</div>
	</N8nCard>
</template>

<style module>
.card {
	border: 2px solid var(--color--primary);
	background-color: var(--background--surface);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin-bottom: var(--spacing--2xs);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}
</style>
