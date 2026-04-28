<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ConfirmationFooter from '../../components/ConfirmationFooter.vue';
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const ctx = useWorkflowSetupContext();
const i18n = useI18n();

const totalSteps = computed(() => ctx.cards.value.length);
const showArrows = computed(() => totalSteps.value > 1);
const isPrevDisabled = computed(() => ctx.currentStepIndex.value === 0);
const isNextDisabled = computed(() => ctx.currentStepIndex.value >= totalSteps.value - 1);
const isActiveCardComplete = computed(() =>
	ctx.activeCard.value ? ctx.isCardComplete(ctx.activeCard.value) : false,
);
const isPrimaryActionDisabled = computed(
	() =>
		ctx.activeCard.value !== undefined &&
		!isActiveCardComplete.value &&
		!ctx.isCardSkipped(ctx.activeCard.value),
);
const isPrimaryActionBlockedByCredentialTest = computed(
	() => ctx.activeCard.value !== undefined && ctx.isCredentialTestFailed(ctx.activeCard.value),
);

const isFinalize = computed(() => ctx.credentialFlow.value?.stage === 'finalize');

const showSkipButton = computed(
	() =>
		ctx.activeCard.value !== undefined &&
		!isActiveCardComplete.value &&
		!ctx.isCardSkipped(ctx.activeCard.value),
);
const skipLabel = computed(() =>
	i18n.baseText(
		isFinalize.value ? 'instanceAi.credential.finalize.later' : 'instanceAi.workflowSetup.later',
	),
);

const applyLabel = computed(() =>
	i18n.baseText(
		isFinalize.value
			? 'instanceAi.credential.finalize.applyCredentials'
			: 'instanceAi.workflowSetup.apply',
	),
);
</script>

<template>
	<WorkflowSetupCard
		v-if="ctx.activeCard.value"
		:key="ctx.activeCard.value.id"
		data-test-id="instance-ai-workflow-setup-wizard"
	>
		<template #footer>
			<ConfirmationFooter layout="row-between" bordered>
				<div :class="$style.nav">
					<N8nButton
						v-if="showArrows"
						variant="ghost"
						size="medium"
						icon-only
						:disabled="isPrevDisabled"
						data-test-id="instance-ai-workflow-setup-prev"
						aria-label="Previous step"
						@click="ctx.goToPrev"
					>
						<N8nIcon icon="chevron-left" size="xsmall" />
					</N8nButton>
					<N8nText size="small" color="text-light">
						{{ ctx.currentStepIndex.value + 1 }} of {{ totalSteps }}
					</N8nText>
					<N8nButton
						v-if="showArrows"
						variant="ghost"
						size="medium"
						icon-only
						:disabled="isNextDisabled"
						data-test-id="instance-ai-workflow-setup-next"
						aria-label="Next step"
						@click="ctx.goToNext"
					>
						<N8nIcon icon="chevron-right" size="xsmall" />
					</N8nButton>
				</div>

				<div :class="$style.actions">
					<N8nButton
						v-if="showSkipButton"
						variant="outline"
						size="medium"
						:class="$style.actionButton"
						:label="skipLabel"
						:disabled="ctx.isActionPending.value"
						data-test-id="instance-ai-workflow-setup-later"
						@click="ctx.skipCurrentCard"
					/>
					<N8nTooltip
						v-if="ctx.showContinueButton.value"
						:disabled="!isPrimaryActionBlockedByCredentialTest"
						:content="i18n.baseText('instanceAi.workflowSetup.credentialTestFailedTooltip')"
					>
						<N8nButton
							size="medium"
							:class="$style.actionButton"
							:label="i18n.baseText('instanceAi.credential.continueButton')"
							:disabled="isPrimaryActionDisabled"
							data-test-id="instance-ai-workflow-setup-continue"
							@click="ctx.goToNextIncomplete"
						/>
					</N8nTooltip>
					<N8nTooltip
						v-else
						:disabled="!isPrimaryActionBlockedByCredentialTest"
						:content="i18n.baseText('instanceAi.workflowSetup.credentialTestFailedTooltip')"
					>
						<N8nButton
							size="medium"
							:class="$style.actionButton"
							:label="applyLabel"
							:disabled="isPrimaryActionDisabled"
							data-test-id="instance-ai-workflow-setup-apply"
							@click="ctx.apply"
						/>
					</N8nTooltip>
				</div>
			</ConfirmationFooter>
		</template>
	</WorkflowSetupCard>
</template>

<style lang="scss" module>
.nav {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actionButton {
	--button--font-size: var(--font-size--2xs);
}
</style>
