<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiCredentialFlow } from '@n8n/api-types';
import ConfirmationFooter from '../../components/ConfirmationFooter.vue';
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import type { WorkflowSetupCard as WorkflowSetupCardType } from '../workflowSetup.types';

type SelectionsMap = Record<string, Record<string, string>>;

const props = defineProps<{
	cards: WorkflowSetupCardType[];
	selections: SelectionsMap;
	setSelection: (nodeName: string, credType: string, credId: string | null) => void;
	isCardComplete: (card: WorkflowSetupCardType) => boolean;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const emit = defineEmits<{
	apply: [];
	defer: [];
}>();

const currentStepIndex = defineModel<number>('currentStepIndex', { default: 0 });

const i18n = useI18n();

const totalSteps = computed(() => props.cards.length);

const isPrevDisabled = computed(() => currentStepIndex.value === 0);
const isNextDisabled = computed(() => currentStepIndex.value >= totalSteps.value - 1);

function goToNext() {
	if (!isNextDisabled.value) currentStepIndex.value++;
}

function goToPrev() {
	if (!isPrevDisabled.value) currentStepIndex.value--;
}

function goToStep(index: number) {
	if (index >= 0 && index < totalSteps.value) {
		currentStepIndex.value = index;
	}
}

const currentCard = computed(() => props.cards[currentStepIndex.value]);
const showArrows = computed(() => totalSteps.value > 1);

const isFinalize = computed(() => props.credentialFlow?.stage === 'finalize');

const laterLabel = computed(() =>
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

const selectedIdForCurrent = computed(() => {
	const card = currentCard.value;
	if (!card) return null;
	return props.selections[card.targetNodeName]?.[card.credentialType] ?? null;
});

const anySelected = computed(() => props.cards.some((c) => props.isCardComplete(c)));

// Track manual navigation so the auto-advance watcher below doesn't
// override an explicit step change the user just made.
const userNavigated = ref(false);

function wrappedNext() {
	userNavigated.value = true;
	goToNext();
}

function wrappedPrev() {
	userNavigated.value = true;
	goToPrev();
}

watch(
	() => (currentCard.value ? props.isCardComplete(currentCard.value) : false),
	(complete, prevComplete) => {
		if (!complete || prevComplete || userNavigated.value) {
			userNavigated.value = false;
			return;
		}
		const nextIncomplete = props.cards.findIndex(
			(c, idx) => idx > currentStepIndex.value && !props.isCardComplete(c),
		);
		if (nextIncomplete >= 0) {
			goToStep(nextIncomplete);
		}
	},
);

function onCardCredentialSelected(
	card: WorkflowSetupCardType,
	payload: { credentialId: string | null },
) {
	props.setSelection(card.targetNodeName, card.credentialType, payload.credentialId);
}
</script>

<template>
	<WorkflowSetupCard
		v-if="currentCard"
		:key="currentCard.id"
		:card="currentCard"
		:selected-credential-id="selectedIdForCurrent"
		:project-id="projectId"
		:is-complete="isCardComplete(currentCard)"
		data-test-id="instance-ai-workflow-setup-wizard"
		@credential-selected="onCardCredentialSelected(currentCard, $event)"
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
						@click="wrappedPrev"
					>
						<N8nIcon icon="chevron-left" size="xsmall" />
					</N8nButton>
					<N8nText size="small" color="text-light">
						{{ currentStepIndex + 1 }} of {{ totalSteps }}
					</N8nText>
					<N8nButton
						v-if="showArrows"
						variant="ghost"
						size="medium"
						icon-only
						:disabled="isNextDisabled"
						data-test-id="instance-ai-workflow-setup-next"
						aria-label="Next step"
						@click="wrappedNext"
					>
						<N8nIcon icon="chevron-right" size="xsmall" />
					</N8nButton>
				</div>

				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="medium"
						:class="$style.actionButton"
						:label="laterLabel"
						data-test-id="instance-ai-workflow-setup-later"
						@click="emit('defer')"
					/>
					<N8nButton
						size="medium"
						:class="$style.actionButton"
						:label="applyLabel"
						:disabled="!anySelected"
						data-test-id="instance-ai-workflow-setup-apply"
						@click="emit('apply')"
					/>
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
