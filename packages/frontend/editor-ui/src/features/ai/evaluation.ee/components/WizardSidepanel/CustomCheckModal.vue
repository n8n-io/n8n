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

const wizardStore = useEvaluationsWizardSidepanelStore();
const locale = useI18n();

const { isCustomCheckModalOpen } = storeToRefs(wizardStore);

const name = ref('');
const expression = ref('');

watch(isCustomCheckModalOpen, (open) => {
	if (!open) {
		name.value = '';
		expression.value = '';
	}
});

const canSubmit = computed(() => Boolean(name.value.trim()) && Boolean(expression.value.trim()));

function handleSubmit() {
	if (!canSubmit.value) return;
	wizardStore.addCustomCheck({
		name: name.value.trim(),
		expression: expression.value,
	});
	wizardStore.closeCustomCheckModal();
}

function handleOpenChange(open: boolean) {
	if (!open) wizardStore.closeCustomCheckModal();
}
</script>

<template>
	<N8nDialog :open="isCustomCheckModalOpen" size="xlarge" @update:open="handleOpenChange">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ locale.baseText('evaluations.wizardSidepanel.customCheck.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<div :class="$style.body" data-test-id="evaluations-wizard-sidepanel-custom-check-modal">
			<div :class="$style.form">
				<div :class="$style.field">
					<N8nText size="small" bold color="text-dark" tag="label">
						{{ locale.baseText('evaluations.wizardSidepanel.customCheck.name') }}
					</N8nText>
					<N8nInput
						v-model="name"
						size="medium"
						:placeholder="
							locale.baseText('evaluations.wizardSidepanel.customCheck.name.placeholder')
						"
						data-test-id="custom-check-name-input"
					/>
				</div>

				<div :class="$style.field">
					<N8nText size="small" bold color="text-dark" tag="label">
						{{ locale.baseText('evaluations.wizardSidepanel.customCheck.expression') }}
					</N8nText>
					<N8nText size="xsmall" color="text-light">
						{{ locale.baseText('evaluations.wizardSidepanel.customCheck.expression.hint') }}
					</N8nText>
					<N8nInput
						v-model="expression"
						type="textarea"
						:rows="6"
						size="medium"
						:placeholder="
							locale.baseText('evaluations.wizardSidepanel.customCheck.expression.placeholder')
						"
						:class="$style.expressionInput"
						data-test-id="custom-check-expression-input"
					/>
				</div>
			</div>

			<div :class="$style.footer">
				<N8nButton
					variant="solid"
					size="medium"
					type="button"
					:disabled="!canSubmit"
					data-test-id="custom-check-submit"
					@click="handleSubmit"
				>
					{{ locale.baseText('evaluations.wizardSidepanel.customCheck.submit') }}
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
