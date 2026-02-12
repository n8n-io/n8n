<script setup lang="ts">
import { computed, ref } from 'vue';

import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { PlanMode } from '../../assistant.types';

const props = withDefaults(
	defineProps<{
		message: PlanMode.PlanMessage;
		disabled?: boolean;
		showActions?: boolean;
	}>(),
	{
		showActions: true,
	},
);

const emit = defineEmits<{
	decision: [value: { action: 'approve' | 'reject' | 'modify'; feedback?: string }];
}>();

const i18n = useI18n();

// Prevent double-click
const isSubmitted = ref(false);

const plan = computed(() => props.message.data.plan);

function approve() {
	if (isSubmitted.value) return;
	isSubmitted.value = true;
	emit('decision', { action: 'approve' });
}
</script>

<template>
	<div :class="$style.message" data-test-id="plan-mode-plan-message">
		<div :class="$style.card">
			<!-- Summary (bold, no header) -->
			<N8nText>{{ plan.summary }}</N8nText>

			<!-- Trigger (inline label) -->
			<div :class="$style.triggerSection">
				<N8nText>{{ i18n.baseText('aiAssistant.builder.planMode.plan.triggerLabel') }}:</N8nText>
				<N8nText tag="p">{{ plan.trigger }}</N8nText>
			</div>

			<!-- Steps -->
			<ol :class="$style.steps">
				<li v-for="(step, idx) in plan.steps" :key="idx">
					<N8nText>{{ step.description }}</N8nText>
					<ul v-if="step.subSteps?.length" :class="$style.subSteps">
						<li v-for="(sub, subIdx) in step.subSteps" :key="subIdx">
							<N8nText>{{ sub }}</N8nText>
						</li>
					</ul>
				</li>
			</ol>

			<!-- Notes (if present) -->
			<div v-if="plan.additionalSpecs?.length" :class="$style.section">
				<N8nText>{{ i18n.baseText('aiAssistant.builder.planMode.plan.notesLabel') }}</N8nText>
				<ul :class="$style.notes">
					<li v-for="(note, idx) in plan.additionalSpecs" :key="idx">
						<N8nText>{{ note }}</N8nText>
					</li>
				</ul>
			</div>

			<!-- Actions (only if showActions) - just Implement button, users can type in chat to modify -->
			<div v-if="showActions" :class="$style.actions">
				<N8nButton
					type="primary"
					:disabled="disabled || isSubmitted"
					data-test-id="plan-mode-plan-approve"
					@click="approve"
				>
					{{ i18n.baseText('aiAssistant.builder.planMode.actions.implement') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.message {
	margin-top: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
	line-height: var(--line-height--xl);
	font-size: var(--font-size--sm);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	border-radius: var(--radius--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.triggerSection {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: baseline;
}

.steps {
	margin: 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--2xs);
}

.subSteps {
	margin: var(--spacing--4xs) 0 0 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--4xs);
}

.notes {
	margin: 0;
	padding-left: var(--spacing--md);
	display: grid;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
