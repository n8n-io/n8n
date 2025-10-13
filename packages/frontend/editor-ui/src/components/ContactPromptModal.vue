<script setup lang="ts">
import { computed, ref } from 'vue';
import type { N8nPromptResponse } from '@n8n/rest-api-client/api/prompts';
import type { ModalKey } from '@/Interface';
import { VALID_EMAIL_REGEX } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from '@n8n/utils/event-bus';
import { useToast } from '@/composables/useToast';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';
import { useTelemetry } from '@/composables/useTelemetry';

import { N8nButton, N8nHeading, N8nInput, N8nText } from '@n8n/design-system';
defineProps<{
	modalName: ModalKey;
}>();

const email = ref('');
const modalBus = createEventBus();

const npsSurveyStore = useNpsSurveyStore();
const rootStore = useRootStore();
const usersStore = useUsersStore();

const toast = useToast();
const telemetry = useTelemetry();

const title = computed(() => {
	if (npsSurveyStore.promptsData?.title) {
		return npsSurveyStore.promptsData.title;
	}

	return 'You’re a power user 💪';
});

const description = computed(() => {
	if (npsSurveyStore.promptsData?.message) {
		return npsSurveyStore.promptsData.message;
	}

	return 'Your experience with n8n can help us improve — for you and our entire community.';
});

const isEmailValid = computed(() => {
	return VALID_EMAIL_REGEX.test(String(email.value).toLowerCase());
});

const closeDialog = () => {
	if (!isEmailValid.value) {
		telemetry.track('User closed email modal', {
			instance_id: rootStore.instanceId,
			email: null,
		});
	}
};

const send = async () => {
	if (isEmailValid.value) {
		const response = (await usersStore.submitContactInfo(email.value)) as N8nPromptResponse;

		if (response.updated) {
			telemetry.track('User closed email modal', {
				instance_id: rootStore.instanceId,
				email: email.value,
			});
			toast.showMessage({
				title: 'Thanks!',
				message: "It's people like you that help make n8n better",
				type: 'success',
			});
		}
		modalBus.emit('close');
	}
};
</script>

<template>
	<Modal
		:name="modalName"
		:event-bus="modalBus"
		:center="true"
		:close-on-press-escape="false"
		:before-close="closeDialog"
		custom-class="contact-prompt-modal"
		width="460px"
	>
		<template #header>
			<N8nHeading tag="h2" size="xlarge" color="text-dark">{{ title }}</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.description">
				<N8nText size="medium" color="text-base">{{ description }}</N8nText>
			</div>
			<div @keyup.enter="send">
				<N8nInput v-model="email" placeholder="Your email address" />
			</div>
			<div :class="$style.disclaimer">
				<N8nText size="small" color="text-base"
					>David from our product team will get in touch personally</N8nText
				>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton label="Send" float="right" :disabled="!isEmailValid" @click="send" />
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.description {
	margin-bottom: var(--spacing--sm);
}

.disclaimer {
	margin-top: var(--spacing--4xs);
}
</style>

<style lang="scss">
.dialog-wrapper {
	.contact-prompt-modal {
		.el-dialog__body {
			padding: 16px 24px 24px;
		}
	}
}
</style>
