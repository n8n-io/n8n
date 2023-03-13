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
						<template #ranSuccefully>
							<n8n-text>
								<a :class="$style.link">{{
									locale.baseText('userActivationSurveyModal.description.workflowRanSuccefully')
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
import { USER_ACTIVATION_SURVEY_MODAL } from '../constants';
import { useUsersStore } from '@/stores/users';
import confetti from 'canvas-confetti';
import { IUser } from 'n8n-workflow';
import { telemetry } from '@/plugins/telemetry';
import { i18n as locale } from '@/plugins/i18n';

const userStore = useUsersStore();

const hasAnyChanges = ref(false);
const feedback = ref('');
const modalBus = new Vue();
const workflowName = ref('');

onMounted(() => {
	workflowName.value = userStore.currentUser?.settings?.firstWorkflowName ?? '';

	confetti({
		particleCount: 200,
		spread: 100,
		origin: { y: 0.6 },
		zIndex: 2050,
		colors: ['5C4EC2', 'D7E6F1', 'FF9284', '8D7FED', 'B8AFF9', 'FF6D5A'],
	});
});

const onShareFeedback = () => {
	telemetry.track('User responded to activation modal', { response: feedback.value });
	modalBus.$emit('close');
};

const buildUserObject = (currentUser: IUser) => {
	const currentSettings = userStore.currentUser?.settings;
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

const beforeClosingModal = () => {
	const currentUser = userStore.currentUser;
	if (currentUser) {
		userStore.updateUser(buildUserObject(currentUser));
	}
	return true;
};

const onInput = () => {
	hasAnyChanges.value = true;
};
</script>

<style module lang="scss">
.form {
	margin-top: var(--spacing-l);
}

.link {
	font-weight: var(--font-weight-bold);
}

.description {
	font-size: var(--font-size-m);
}

.container > * {
	margin-bottom: var(--spacing-s);
	&:last-child {
		margin-bottom: 0;
	}
}
</style>
