<script setup lang="ts">
/**
 * Renders an n8n Assistant confirmation inside the Agents chat. Each card
 * emits the Assistant confirm body (`InstanceAiConfirmRequest`) as the resume
 * data; the Agents chat resumes the suspended tool call with it.
 */
import { computed, ref } from 'vue';
import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import { N8nApprovalCard, N8nButton, N8nCard, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import type { AssistantConfirmationInput } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import InstanceAiQuestions, { type QuestionAnswer } from '../InstanceAiQuestions.vue';
import PlanReviewPanel from '../PlanReviewPanel.vue';
import DomainAccessApproval from '../DomainAccessApproval.vue';
import { resolvePlanTasksFromConfirmation } from '../../planReview.utils';

const props = defineProps<{
	input: AssistantConfirmationInput;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: InstanceAiConfirmRequest];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();
const submitted = ref(false);
const textValue = ref('');

const isInactive = computed(() => props.disabled || submitted.value);

const variant = computed(() => {
	const { input } = props;
	if (input.inputType === 'questions' && input.questions?.length) return 'questions';
	if (input.inputType === 'plan-review') return 'plan-review';
	if (input.domainAccess) return 'domain-access';
	if (input.webSearch) return 'web-search';
	if (input.inputType === 'text') return 'text';
	if (input.inputType === 'continue') return 'continue';
	return 'approval';
});

const plannedTasks = computed(() =>
	resolvePlanTasksFromConfirmation(props.input, props.input.args),
);

function submit(body: InstanceAiConfirmRequest) {
	if (isInactive.value) return;
	submitted.value = true;
	emit('submit', body);
}

function onQuestionsSubmit(answers: QuestionAnswer[]) {
	submit({
		kind: 'questions',
		answers: answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
			questionId,
			selectedOptions,
			...(customText !== undefined && { customText }),
			...(skipped !== undefined && { skipped }),
		})),
	});
}

function onTextSubmit() {
	const value = textValue.value.trim();
	if (!value) return;
	submit({ kind: 'approval', approved: true, userInput: value });
}

function onApprovalSelect(key: string) {
	if (key === 'allow-once' || key === 'deny') {
		submit({ kind: 'approval', approved: key === 'allow-once' });
	}
}
</script>

<template>
	<InstanceAiQuestions
		v-if="variant === 'questions'"
		:questions="input.questions ?? []"
		:intro-message="input.introMessage"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-questions"
		@submit="onQuestionsSubmit"
	/>

	<PlanReviewPanel
		v-else-if="variant === 'plan-review'"
		:planned-tasks="plannedTasks"
		:message="input.introMessage"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-plan-review"
		@approve="submit({ kind: 'approval', approved: true })"
		@deny="submit({ kind: 'planDeny' })"
	/>

	<DomainAccessApproval
		v-else-if="variant === 'domain-access' && input.domainAccess"
		:request-id="input.requestId"
		:url="input.domainAccess.url"
		:host="input.domainAccess.host"
		:severity="input.severity"
		:submit="submit"
	/>

	<DomainAccessApproval
		v-else-if="variant === 'web-search' && input.webSearch"
		:request-id="input.requestId"
		:query="input.webSearch.query"
		:severity="input.severity"
		:submit="submit"
	/>

	<N8nCard v-else-if="variant === 'text'" :class="$style.card">
		<N8nText tag="div">{{ input.message }}</N8nText>
		<div :class="$style.row">
			<N8nInput
				v-model="textValue"
				type="text"
				size="small"
				:disabled="isInactive"
				:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
				@keydown.enter="onTextSubmit"
			/>
			<N8nButton
				v-if="!textValue.trim()"
				size="medium"
				variant="outline"
				:disabled="isInactive"
				@click="submit({ kind: 'approval', approved: false })"
			>
				{{ i18n.baseText('instanceAi.askUser.skip') }}
			</N8nButton>
			<N8nButton
				size="medium"
				variant="solid"
				:disabled="isInactive || !textValue.trim()"
				@click="onTextSubmit"
			>
				{{ i18n.baseText('instanceAi.askUser.submit') }}
			</N8nButton>
		</div>
	</N8nCard>

	<N8nCard v-else-if="variant === 'continue'" :class="$style.card">
		<N8nText tag="div">{{ input.message }}</N8nText>
		<div :class="[$style.row, $style.end]">
			<N8nButton
				size="medium"
				variant="solid"
				:disabled="isInactive"
				@click="submit({ kind: 'approval', approved: true })"
			>
				{{ i18n.baseText('instanceAi.confirmation.continue') }}
			</N8nButton>
		</div>
	</N8nCard>

	<!-- Fallback for cards not ported to the Agents chat yet (credentials, setup, MCP, ...) -->
	<N8nApprovalCard
		v-else
		:title="i18n.baseText('agents.chat.approval.title')"
		:labels="approvalLabels"
		:description="input.message"
		:args="input.targetApproval?.args ?? input.args"
		:destructive="input.severity === 'destructive'"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-approval"
		@select="onApprovalSelect"
	/>
</template>

<style lang="scss" module>
.card {
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.end {
	justify-content: flex-end;
}
</style>
