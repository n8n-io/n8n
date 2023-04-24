<template>
	<Modal
		width="500px"
		:title="locale.baseText('userActivationSurveyModal.title')"
		:eventBus="modalBus"
		:name="USER_ACTIVATION_SURVEY_MODAL"
		:center="true"
		:beforeClose="beforeClosingModal"
	>
		<template #content>
			<div :class="$style.container">
				<div :class="$style.description">
					<i18n path="userActivationSurveyModal.description.workflowRan">
						<template #workflow>
							<n8n-text :bold="true"> {{ workflowName }} </n8n-text>
						</template>
						<template #ranSuccessfully>
							<n8n-text>
								{{
									locale.baseText('userActivationSurveyModal.description.workflowRanSuccessfully')
								}}
							</n8n-text>
						</template>
						<template #savedTime>
							<n8n-text>
								{{ locale.baseText('userActivationSurveyModal.description.savedTime') }}
							</n8n-text>
						</template>
					</i18n>
				</div>
				<div :class="$style.form">
					<n8n-input-label
						:label="$locale.baseText('userActivationSurveyModal.form.label')"
						color="text-dark"
					>
						<n8n-input
							type="textarea"
							:maxlength="FEEDBACK_MAX_LENGTH"
							:rows="3"
							v-model="feedback"
							@input="onInput"
							data-test-id="activation-feedback-input"
						/>
					</n8n-input-label>
				</div>
			</div>
		</template>
		<template #footer>
			<div :class="$style.modalFooter">
				<n8n-button
					:disabled="!hasAnyChanges"
					@click="onShareFeedback"
					size="large"
					float="right"
					:label="locale.baseText('userActivationSurveyModal.form.button.shareFeedback')"
					data-test-id="send-activation-feedback-button"
				/>
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '@/components/Modal.vue';
import { USER_ACTIVATION_SURVEY_MODAL } from '@/constants';
import { useUsersStore } from '@/stores/users';

import confetti from 'canvas-confetti';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@/plugins/i18n';
import { Notification } from 'element-ui';
import { useWorkflowsStore } from '@/stores/workflows';
import { createEventBus } from '@/event-bus';

const FEEDBACK_MAX_LENGTH = 300;

const userStore = useUsersStore();
const workflowStore = useWorkflowsStore();

const hasAnyChanges = ref(false);
const feedback = ref('');
const modalBus = createEventBus();
const workflowName = ref('');

onMounted(async () => {
	const currentSettings = getCurrentSettings();
	try {
		const { name } = await workflowStore.fetchWorkflow(
			currentSettings?.firstSuccessfulWorkflowId ?? '',
		);
		workflowName.value = name;
		setTimeout(showConfetti, 500);
	} catch (e) {}
});

const onShareFeedback = () => {
	telemetry.track('User responded to activation modal', { response: getFeedback() });
	showSharedFeedbackSuccess();
	modalBus.emit('close');
};

const getCurrentSettings = () => {
	return userStore.currentUser?.settings;
};

const getFeedback = () => {
	return feedback.value.slice(0, FEEDBACK_MAX_LENGTH);
};

const beforeClosingModal = async () => {
	const currentUser = userStore.currentUser;
	if (currentUser) {
		try {
			await userStore.updateUserSettings({ showUserActivationSurvey: false });
		} catch {
			showSharedFeedbackError();
			return false;
		}
	}
	return true;
};

const onInput = () => {
	hasAnyChanges.value = true;
};

const showSharedFeedbackSuccess = () => {
	Notification.success({
		title: locale.baseText('userActivationSurveyModal.sharedFeedback.success'),
		message: '',
		position: 'bottom-right',
	});
};

const showSharedFeedbackError = () => {
	Notification.error({
		title: locale.baseText('userActivationSurveyModal.sharedFeedback.error'),
		message: '',
		position: 'bottom-right',
	});
};

const showConfetti = () => {
	confetti({
		particleCount: 200,
		spread: 100,
		origin: { y: 0.6 },
		zIndex: 2050,
		colors: ['5C4EC2', 'D7E6F1', 'FF9284', '8D7FED', 'B8AFF9', 'FF6D5A'],
	});
};
</script>

<style module lang="scss">
.form {
	margin-top: var(--spacing-l);
}

.description > * {
	font-size: var(--font-size-s);
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
