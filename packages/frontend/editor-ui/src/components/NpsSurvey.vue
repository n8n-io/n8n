<script lang="ts" setup>
import { NPS_SURVEY_MODAL_KEY } from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import ModalDrawer from '@/components/ModalDrawer.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref, computed, watch } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useStyles } from '@/composables/useStyles';

import { N8nButton, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
const props = defineProps<{
	isActive?: boolean;
}>();

const rootStore = useRootStore();
const i18n = useI18n();
const toast = useToast();
const telemetry = useTelemetry();
const { APP_Z_INDEXES } = useStyles();

const DEFAULT_TITLE = i18n.baseText('prompts.npsSurvey.recommendationQuestion');
const GREAT_FEEDBACK_TITLE = i18n.baseText('prompts.npsSurvey.greatFeedbackTitle');
const DEFAULT_FEEDBACK_TITLE = i18n.baseText('prompts.npsSurvey.defaultFeedbackTitle');
const FEEDBACK_QUESTION_TITLE = i18n.baseText('prompts.npsSurvey.feedbackQuestionTitle');
const VERY_LIKELY_OPTION = i18n.baseText('prompts.npsSurvey.veryLikely');
const NOT_LIKELY_OPTION = i18n.baseText('prompts.npsSurvey.notLikely');
const SEND = i18n.baseText('prompts.npsSurvey.send');

const form = ref<{ value: string; feedback: string }>({
	value: '',
	feedback: '',
});
const showButtons = ref(true);
const showFeedback = ref(false);
const modalBus = createEventBus();

const modalTitle = computed(() => {
	if (showFeedback.value) {
		return FEEDBACK_QUESTION_TITLE;
	}
	if (form?.value?.value !== '') {
		if (Number(form.value.value) > 7) {
			return GREAT_FEEDBACK_TITLE;
		} else {
			return DEFAULT_FEEDBACK_TITLE;
		}
	}
	return DEFAULT_TITLE;
});

async function closeDialog(): Promise<void> {
	if (form.value.value === '') {
		telemetry.track('User responded value survey score', {
			instance_id: rootStore.instanceId,
			nps: '',
		});

		await useNpsSurveyStore().ignoreNpsSurvey();
	}
	// If the user closes the nps modal, we send two events
	// 1. User responded value survey score
	// 2. User responded value survey feedback (if not empty)
	if (form.value.value !== '' && form.value.feedback.trim() === '') {
		telemetry.track('User responded value survey feedback', {
			instance_id: rootStore.instanceId,
			feedback: '',
			nps: form.value.value,
		});
	}
}

async function selectSurveyValue(value: string) {
	form.value.value = value;
	showButtons.value = false;
	showFeedback.value = true;

	telemetry.track('User responded value survey score', {
		instance_id: rootStore.instanceId,
		nps: form.value.value,
	});

	await useNpsSurveyStore().respondNpsSurvey();
}

function onFeedbackInput(value: string) {
	form.value.feedback = value;
}

async function send() {
	if (form.value.feedback.trim() !== '') {
		telemetry.track('User responded value survey feedback', {
			instance_id: rootStore.instanceId,
			nps: form.value.value,
			feedback: form.value.feedback,
		});

		toast.showMessage({
			title: i18n.baseText('prompts.npsSurvey.thanks'),
			message: Number(form.value.value) >= 8 ? i18n.baseText('prompts.npsSurvey.reviewUs') : '',
			type: 'success',
			duration: 15000,
		});

		setTimeout(() => {
			form.value.value = '';
			form.value.feedback = '';
			showButtons.value = true;
			showFeedback.value = false;
		}, 1000);
		modalBus.emit('close');
	}
}

watch(
	() => props.isActive,
	(isActive) => {
		if (isActive) {
			telemetry.track('User shown value survey', {
				instance_id: rootStore.instanceId,
			});
		}
	},
);
</script>

<template>
	<ModalDrawer
		:name="NPS_SURVEY_MODAL_KEY"
		:event-bus="modalBus"
		:before-close="closeDialog"
		:modal="true"
		:wrapper-closable="false"
		direction="btt"
		width="auto"
		class="nps-survey"
		:class="$style.npsSurvey"
		:close-on-click-modal="false"
		:z-index="APP_Z_INDEXES.NPS_SURVEY_MODAL"
		data-test-id="nps-survey-modal"
	>
		<template #header>
			<div :class="$style.title">
				<N8nHeading tag="h2" size="medium" color="text-xlight">{{ modalTitle }}</N8nHeading>
			</div>
		</template>
		<template #content>
			<section :class="$style.content">
				<div v-if="showButtons" :class="$style.wrapper">
					<div :class="$style.buttons" data-test-id="nps-survey-ratings">
						<div v-for="value in 11" :key="value - 1" :class="$style.container">
							<N8nButton
								type="tertiary"
								:label="(value - 1).toString()"
								square
								@click="selectSurveyValue((value - 1).toString())"
							/>
						</div>
					</div>
					<div :class="$style.text">
						<N8nText size="small" color="text-xlight">{{ NOT_LIKELY_OPTION }}</N8nText>
						<N8nText size="small" color="text-xlight">{{ VERY_LIKELY_OPTION }}</N8nText>
					</div>
				</div>
				<div v-else-if="showFeedback" :class="$style.feedback">
					<div :class="$style.input" data-test-id="nps-survey-feedback">
						<N8nInput
							v-model="form.feedback"
							type="textarea"
							:rows="2"
							:class="$style.feedbackInput"
							@update:model-value="onFeedbackInput"
						/>
					</div>
					<div :class="$style.button" data-test-id="nps-survey-feedback-button">
						<N8nButton
							:label="SEND"
							float="right"
							:disabled="!form.feedback.trim()"
							@click="send"
						/>
					</div>
				</div>
			</section>
		</template>
	</ModalDrawer>
</template>

<style module lang="scss">
.title {
	height: 16px;
	text-align: center;

	@media (max-width: $breakpoint-xs) {
		margin-top: 10px;
		padding: 0 15px;
	}

	h2 {
		color: var(--color-nps-survey-font);
	}
}

.content {
	display: flex;
	justify-content: center;
	margin-bottom: 10px;

	@media (max-width: $breakpoint-xs) {
		margin-top: 20px;
	}
}

.wrapper {
	display: flex;
	flex-direction: column;
	.text span {
		color: var(--color-nps-survey-font);
	}
}

.buttons {
	display: flex;
}

.container {
	margin: 0 8px;

	@media (max-width: $breakpoint-xs) {
		margin: 0 4px;
	}

	&:first-child {
		margin-left: 0;
	}

	&:last-child {
		margin-right: 0;
	}
}

.text {
	margin-top: 8px;
	display: flex;
	justify-content: space-between;
}

.input {
	display: flex;
	align-items: center;
}

.button {
	margin-left: 10px;
}

.feedback {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	margin-top: 2px;
	position: relative;
}

.feedbackInput {
	width: 350px;
	max-width: 100%;
	margin-bottom: 10px;
}

.feedbackInput textarea {
	resize: none;
	font-family: var(--font-family);
}

.npsSurvey {
	background: var(--color-nps-survey-background);
	height: 120px;
	top: auto;

	@media (max-width: $breakpoint-xs) {
		height: 140px;
	}

	@media (max-width: $breakpoint-xs) {
		height: 140px !important;
	}

	header {
		height: 50px;
		margin: 0;
		padding: 18px 0 16px;

		button {
			top: 12px;
			right: 16px;
			position: absolute;
			font-weight: var(--font-weight--bold);
			color: var(--color-nps-survey-font);

			@media (max-width: $breakpoint-xs) {
				top: 2px;
				right: 2px;
			}
		}
	}
}
</style>
