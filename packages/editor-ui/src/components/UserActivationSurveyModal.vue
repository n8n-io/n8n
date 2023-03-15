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
								<a target="_blank" :href="executionPath" :class="$style.link">{{
									locale.baseText('userActivationSurveyModal.description.workflowRanSuccessfully')
								}}</a>
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
						<n8n-input v-model="feedback" @input="onInput" ref="input" />
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
				/>
			</div>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Vue from 'vue';
import Modal from './Modal.vue';
import { LOCAL_STORAGE_ACTIVE_MODAL, USER_ACTIVATION_SURVEY_MODAL } from '../constants';
import { useUsersStore } from '@/stores/users';

import confetti from 'canvas-confetti';
import { IUser } from 'n8n-workflow';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@/plugins/i18n';
import { Notification } from 'element-ui';
import { getFinishedExecutions } from '@/api/workflows';
import { useRootStore } from '@/stores/n8nRootStore';

const FEEDBACK_MAX_LENGTH = 300;

const userStore = useUsersStore();
const rootStore = useRootStore();

const hasAnyChanges = ref(false);
const feedback = ref('');
const modalBus = new Vue();
const workflowName = ref('');
const executionPath = ref('');

onMounted(async () => {
	const currentSettings = getCurrentSettings();
	const workflowId = currentSettings?.firstSuccessfulWorkflowId ?? '';
	try {
		const { results: executions } = await getFinishedExecutions(rootStore.getRestApiContext, {
			workflowId,
			limit: 1,
			lastId: -1,
		});
		const executionId = executions[0]?.id ?? '';
		workflowName.value = executions[0]?.workflowName ?? '';
		executionPath.value = `/workflow/${workflowId}/executions/${executionId}`;
		showConfetti();
	} catch (e) {}
});

const onShareFeedback = () => {
	telemetry.track('User responded to activation modal', { response: getFeedback() });
	showSharedFeedbackSuccess();
	modalBus.$emit('close');
};

const getCurrentSettings = () => {
	return userStore.currentUser?.settings;
};

const getFeedback = () => {
	return feedback.value.slice(0, FEEDBACK_MAX_LENGTH);
};

const buildUserObject = (currentUser: IUser) => {
	const currentSettings = getCurrentSettings();
	const { id = '', firstName = '', lastName = '', email = '' } = currentUser;
	const newUser: IUser & { settings: { showUserActivationSurvey: boolean } } = {
		id,
		firstName,
		lastName,
		email,
		settings: {
			...currentSettings,
			showUserActivationSurvey: false,
		},
	};
	return newUser;
};

const beforeClosingModal = async () => {
	const currentUser = userStore.currentUser;
	if (currentUser) {
		try {
			await userStore.updateUser(buildUserObject(currentUser));
		} catch {
			showSharedFeedbackError();
			return false;
		} finally {
			localStorage.removeItem(LOCAL_STORAGE_ACTIVE_MODAL);
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

.link {
	font-weight: var(--font-weight-bold);
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
