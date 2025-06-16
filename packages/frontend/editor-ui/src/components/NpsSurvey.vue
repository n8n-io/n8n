<script lang="ts" setup>
import { VALID_EMAIL_REGEX, NPS_SURVEY_MODAL_KEY } from '@/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import ModalDrawer from '@/components/ModalDrawer.vue';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ref, computed, watch } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useTelemetry } from '@/composables/useTelemetry';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useStyles } from '@/composables/useStyles';

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
const PRODUCT_TEAM_MESSAGE = i18n.baseText('prompts.productTeamMessage');
const VERY_LIKELY_OPTION = i18n.baseText('prompts.npsSurvey.veryLikely');
const NOT_LIKELY_OPTION = i18n.baseText('prompts.npsSurvey.notLikely');
const SEND = i18n.baseText('prompts.npsSurvey.send');
const YOUR_EMAIL_ADDRESS = i18n.baseText('prompts.npsSurvey.yourEmailAddress');

const form = ref<{ value: string; email: string }>({ value: '', email: '' });
const showButtons = ref(true);
const modalBus = createEventBus();

const modalTitle = computed(() => {
	if (form?.value?.value !== '') {
		if (Number(form.value) > 7) {
			return GREAT_FEEDBACK_TITLE;
		} else {
			return DEFAULT_FEEDBACK_TITLE;
		}
	}

	return DEFAULT_TITLE;
});

const isEmailValid = computed(
	() => form?.value?.email && VALID_EMAIL_REGEX.test(String(form.value.email).toLowerCase()),
);

async function closeDialog(): Promise<void> {
	if (form.value.value === '') {
		telemetry.track('User responded value survey score', {
			instance_id: rootStore.instanceId,
			nps: '',
		});

		await useNpsSurveyStore().ignoreNpsSurvey();
	}
	if (form.value.value !== '' && form.value.email === '') {
		telemetry.track('User responded value survey email', {
			instance_id: rootStore.instanceId,
			email: '',
			nps: form.value.value,
		});
	}
}

function onInputChange(value: string) {
	form.value.email = value;
}

async function selectSurveyValue(value: string) {
	form.value.value = value;
	showButtons.value = false;

	telemetry.track('User responded value survey score', {
		instance_id: rootStore.instanceId,
		nps: form.value.value,
	});

	await useNpsSurveyStore().respondNpsSurvey();
}

async function send() {
	if (isEmailValid.value) {
		telemetry.track('User responded value survey email', {
			instance_id: rootStore.instanceId,
			email: form.value.email,
			nps: form.value.value,
		});

		toast.showMessage({
			title: i18n.baseText('prompts.npsSurvey.thanks'),
			message: Number(form.value.value) >= 8 ? i18n.baseText('prompts.npsSurvey.reviewUs') : '',
			type: 'success',
			duration: 15000,
		});

		setTimeout(() => {
			form.value.value = '';
			form.value.email = '';
			showButtons.value = true;
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
		width="120px"
		class="nps-survey"
		:class="$style.npsSurvey"
		:close-on-click-modal="false"
		:z-index="APP_Z_INDEXES.NPS_SURVEY_MODAL"
		data-test-id="nps-survey-modal"
	>
		<template #header>
			<div :class="$style.title">
				<n8n-heading tag="h2" size="medium" color="text-xlight">{{ modalTitle }}</n8n-heading>
			</div>
		</template>
		<template #content>
			<section :class="$style.content">
				<div v-if="showButtons" :class="$style.wrapper">
					<div :class="$style.buttons" data-test-id="nps-survey-ratings">
						<div v-for="value in 11" :key="value - 1" :class="$style.container">
							<n8n-button
								type="tertiary"
								:label="(value - 1).toString()"
								square
								@click="selectSurveyValue((value - 1).toString())"
							/>
						</div>
					</div>
					<div :class="$style.text">
						<n8n-text size="small" color="text-xlight">{{ NOT_LIKELY_OPTION }}</n8n-text>
						<n8n-text size="small" color="text-xlight">{{ VERY_LIKELY_OPTION }}</n8n-text>
					</div>
				</div>
				<div v-else :class="$style.email">
					<div :class="$style.input" data-test-id="nps-survey-email" @keyup.enter="send">
						<n8n-input
							v-model="form.email"
							:placeholder="YOUR_EMAIL_ADDRESS"
							@update:model-value="onInputChange"
						/>
						<div :class="$style.button">
							<n8n-button :label="SEND" float="right" :disabled="!isEmailValid" @click="send" />
						</div>
					</div>
					<div :class="$style.disclaimer">
						<n8n-text size="small" color="text-dark">
							{{ PRODUCT_TEAM_MESSAGE }}
						</n8n-text>
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

.disclaimer {
	margin-top: var(--spacing-4xs);
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
			font-weight: var(--font-weight-bold);
			color: var(--color-nps-survey-font);

			@media (max-width: $breakpoint-xs) {
				top: 2px;
				right: 2px;
			}
		}
	}
}
</style>
