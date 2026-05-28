<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nDialog,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nText,
} from '@n8n/design-system';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';

// The modal only collects expression scorers for now — the Set Metrics node
// doesn't expose a fully custom LLM judge, so we don't offer that tab
// either. The two canned LLM judge presets (correctness, helpfulness) are
// still available through the step-1 metric list.
//
// The expression input is a plain textarea for now; an earlier attempt to
// drop in the n8n expression editor (CodeMirror) couldn't get autocomplete
// to fire from inside this dialog and is parked for now.

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();

const { isCustomScorerModalOpen } = storeToRefs(wizardStore);

// Reset form state every time the modal closes so the next open starts
// blank — avoids the previous draft leaking across.
const name = ref('');
const expression = ref('');

watch(isCustomScorerModalOpen, (open) => {
	if (!open) {
		name.value = '';
		expression.value = '';
	}
});

const canSubmit = computed(() => Boolean(name.value.trim()) && Boolean(expression.value.trim()));

function handleSubmit() {
	if (!canSubmit.value) return;
	wizardStore.addCustomScorer({
		name: name.value.trim(),
		expression: expression.value,
	});
	wizardStore.closeCustomScorerModal();
}

function handleOpenChange(open: boolean) {
	if (!open) wizardStore.closeCustomScorerModal();
}
</script>

<template>
	<N8nDialog :open="isCustomScorerModalOpen" size="xlarge" @update:open="handleOpenChange">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ locale.baseText('evaluations.wizardSidepanel.customScorer.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<div :class="$style.body" data-test-id="evaluations-wizard-sidepanel-custom-scorer-modal">
			<div :class="$style.form">
				<div :class="$style.field">
					<N8nText size="small" bold color="text-dark" tag="label">
						{{ locale.baseText('evaluations.wizardSidepanel.customScorer.name') }}
					</N8nText>
					<N8nInput
						v-model="name"
						size="medium"
						:placeholder="
							locale.baseText('evaluations.wizardSidepanel.customScorer.name.placeholder')
						"
						data-test-id="custom-scorer-name-input"
					/>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold color="text-dark" tag="label">
						{{ locale.baseText('evaluations.wizardSidepanel.customScorer.expression') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ locale.baseText('evaluations.wizardSidepanel.customScorer.expression.hint') }}
					</N8nText>
					<N8nInput
						v-model="expression"
						type="textarea"
						:rows="6"
						size="medium"
						:placeholder="
							locale.baseText('evaluations.wizardSidepanel.customScorer.expression.placeholder')
						"
						:class="$style.expressionInput"
						data-test-id="custom-scorer-expression-input"
					/>
				</div>
			</div>

			<div :class="$style.footer">
				<N8nButton
					variant="solid"
					size="medium"
					type="button"
					:disabled="!canSubmit"
					data-test-id="custom-scorer-submit"
					@click="handleSubmit"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.customScorer.submit') }}
				</N8nButton>
			</div>
		</div>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: var(--spacing--sm);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.expressionInput {
	font-family: var(--font-family--monospace, monospace);
}

.footer {
	display: flex;
	justify-content: flex-end;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}
</style>
