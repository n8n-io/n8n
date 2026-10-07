<script lang="ts" setup>
import { computed } from 'vue';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ConfirmationFooter from '../../components/ConfirmationFooter.vue';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const ctx = useWorkflowSetupContext();
const i18n = useI18n();

const totalSteps = computed(() => ctx.sections.value.length);
const showArrows = computed(() => totalSteps.value > 1);
const isPrevDisabled = computed(() => ctx.currentStepIndex.value === 0);
const isNextDisabled = computed(() => ctx.currentStepIndex.value >= totalSteps.value - 1);

// Gates both the primary action and the skip button: the user still owes input.
const isActiveSectionUnhandled = computed(() => {
	const section = ctx.activeSection.value;
	return section !== undefined && !ctx.isSectionHandled(section);
});

const isPrimaryActionBlockedByCredentialTest = computed(() => {
	const section = ctx.activeSection.value;
	if (!section) return false;

	return !ctx.isSectionSkipped(section) && ctx.isCredentialTestFailed(section);
});

const primaryActionTooltip = computed(() => {
	if (isPrimaryActionBlockedByCredentialTest.value) {
		return i18n.baseText('instanceAi.workflowSetup.credentialTestFailedTooltip');
	}
	if (isActiveSectionUnhandled.value) {
		return i18n.baseText('instanceAi.workflowSetup.stepIncompleteTooltip');
	}
	return undefined;
});

const isFinalize = computed(() => ctx.credentialFlow.value?.stage === 'finalize');

const showContinueButton = computed(() => ctx.hasOtherUnhandledSteps.value);

const skipLabel = computed(() =>
	i18n.baseText(
		isFinalize.value ? 'instanceAi.credential.finalize.later' : 'instanceAi.workflowSetup.later',
	),
);

const primaryActionLabel = computed(() => {
	if (showContinueButton.value) return i18n.baseText('instanceAi.credential.continueButton');

	return i18n.baseText(
		isFinalize.value
			? 'instanceAi.credential.finalize.applyCredentials'
			: 'instanceAi.workflowSetup.apply',
	);
});

const primaryActionTestId = computed(() =>
	showContinueButton.value
		? 'instance-ai-workflow-setup-continue'
		: 'instance-ai-workflow-setup-apply',
);

function onPrimaryAction() {
	if (showContinueButton.value) {
		ctx.goToNextIncomplete();
		return;
	}

	void ctx.apply();
}
</script>

<template>
	<ConfirmationFooter layout="row-between" bordered>
		<div :class="$style.nav">
			<N8nIconButton
				v-if="showArrows"
				variant="ghost"
				size="medium"
				icon="chevron-left"
				:disabled="isPrevDisabled"
				data-test-id="instance-ai-workflow-setup-prev"
				:aria-label="i18n.baseText('instanceAi.workflowSetup.prevStep')"
				@click="ctx.goToPrev"
			/>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('instanceAi.workflowSetup.stepCounter', {
						interpolate: { current: ctx.currentStepIndex.value + 1, total: totalSteps },
					})
				}}
			</N8nText>
			<N8nIconButton
				v-if="showArrows"
				variant="ghost"
				size="medium"
				icon="chevron-right"
				:disabled="isNextDisabled"
				data-test-id="instance-ai-workflow-setup-next"
				:aria-label="i18n.baseText('instanceAi.workflowSetup.nextStep')"
				@click="ctx.goToNext"
			/>
		</div>

		<div :class="$style.actions">
			<N8nButton
				v-if="isActiveSectionUnhandled"
				variant="outline"
				size="medium"
				:label="skipLabel"
				:disabled="ctx.isActionPending.value"
				data-test-id="instance-ai-workflow-setup-later"
				@click="ctx.skipCurrentStep"
			/>
			<N8nTooltip :disabled="!primaryActionTooltip" :content="primaryActionTooltip">
				<N8nButton
					size="medium"
					:label="primaryActionLabel"
					:disabled="isActiveSectionUnhandled"
					:data-test-id="primaryActionTestId"
					@click="onPrimaryAction"
				/>
			</N8nTooltip>
		</div>
	</ConfirmationFooter>
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
</style>
