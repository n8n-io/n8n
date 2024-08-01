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
			<n8n-heading tag="h2" size="xlarge" color="text-dark">{{ title }}</n8n-heading>
		</template>
		<template #content>
			<div :class="$style.description">
				<n8n-text size="medium" color="text-base">{{ description }}</n8n-text>
			</div>
			<div @keyup.enter="send">
				<n8n-input v-model="email" placeholder="Your email address" />
			</div>
			<div :class="$style.disclaimer">
				<n8n-text size="small" color="text-base"
					>David from our product team will get in touch personally</n8n-text
				>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button label="Send" float="right" :disabled="!isEmailValid" @click="send" />
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import type { IN8nPromptResponse, ModalKey } from '@/Interface';
import { VALID_EMAIL_REGEX } from '@/constants';
import Modal from '@/components/Modal.vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@/stores/root.store';
import { createEventBus } from 'n8n-design-system/utils';
import { useToast } from '@/composables/useToast';
import { useNpsSurveyStore } from '@/stores/npsSurvey.store';

export default defineComponent({
	name: 'ContactPromptModal',
	components: { Modal },
	props: {
		modalName: {
			type: String as PropType<ModalKey>,
			required: true,
		},
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			email: '',
			modalBus: createEventBus(),
		};
	},
	computed: {
		...mapStores(useRootStore, useSettingsStore, useNpsSurveyStore),
		title(): string {
			if (this.npsSurveyStore.promptsData?.title) {
				return this.npsSurveyStore.promptsData.title;
			}

			return 'You’re a power user 💪';
		},
		description(): string {
			if (this.npsSurveyStore.promptsData?.message) {
				return this.npsSurveyStore.promptsData.message;
			}

			return 'Your experience with n8n can help us improve — for you and our entire community.';
		},
		isEmailValid(): boolean {
			return VALID_EMAIL_REGEX.test(String(this.email).toLowerCase());
		},
	},
	methods: {
		closeDialog(): void {
			if (!this.isEmailValid) {
				this.$telemetry.track('User closed email modal', {
					instance_id: this.rootStore.instanceId,
					email: null,
				});
			}
		},
		async send() {
			if (this.isEmailValid) {
				const response = (await this.settingsStore.submitContactInfo(
					this.email,
				)) as IN8nPromptResponse;

				if (response.updated) {
					this.$telemetry.track('User closed email modal', {
						instance_id: this.rootStore.instanceId,
						email: this.email,
					});
					this.showMessage({
						title: 'Thanks!',
						message: "It's people like you that help make n8n better",
						type: 'success',
					});
				}
				this.modalBus.emit('close');
			}
		},
	},
});
</script>

<style lang="scss" module>
.description {
	margin-bottom: var(--spacing-s);
}

.disclaimer {
	margin-top: var(--spacing-4xs);
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
