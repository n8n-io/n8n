<template>
	<Modal
		:name="ONBOARDING_CALL_SIGNUP_MODAL_KEY"
		:title="$locale.baseText('onboardingCallSignupModal.title')"
		:eventBus="modalBus"
		:center="true"
		:showClose="false"
		:beforeClose="onModalClose"
		width="460px"
	>
		<template slot="content">
			<div class="pb-m">
				<n8n-text>
					{{ $locale.baseText('onboardingCallSignupModal.description') }}
				</n8n-text>
			</div>
			<div @keyup.enter="onSignup">
				<n8n-input v-model="email" :placeholder="$locale.baseText('onboardingCallSignupModal.emailInput.placeholder')" />
				<n8n-text v-if="showError" size="small" class="mt-4xs" tag="div" color="danger">
					{{ $locale.baseText('onboardingCallSignupModal.infoText.emailError') }}
				</n8n-text>
			</div>
		</template>
		<template slot="footer">
			<div :class="$style.buttonsContainer">
				<n8n-button
					:disabled="email === ''"
					:label="$locale.baseText('onboardingCallSignupModal.signupButton.label')"
					size="large"
					float="right"
					@click="onSignup"
				/>
				<n8n-button
					:label="$locale.baseText('onboardingCallSignupModal.cancelButton.label')"
					size="large"
					float="right"
					@click="onCancel"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	ONBOARDING_CALL_SIGNUP_MODAL_KEY,
	VALID_EMAIL_REGEX,
} from '@/constants';
import Modal from './Modal.vue';

import mixins from 'vue-typed-mixins';
import { showMessage } from './mixins/showMessage';

export default mixins(
	showMessage,
).extend({
	components: {
		Modal,
	},
	name: 'OnboardingCallSignupModal',
	props: [ 'modalName' ],
	data() {
		return {
			email: '',
			modalBus: new Vue(),
			ONBOARDING_CALL_SIGNUP_MODAL_KEY,
			showError: false,
			exitConfirmed: false,
		};
	},
	computed: {
		isEmailValid(): boolean {
			return VALID_EMAIL_REGEX.test(String(this.email).toLowerCase());
		},
	},
	methods: {
		onSignup() {
			if (!this.isEmailValid) {
				this.showError = true;
				return;
			}
			this.showError = false;
			// TODO: Submit email here
			this.$showMessage({
				type: 'success',
				title: this.$locale.baseText('onboardingCallSignupSucess.title'),
			});
			this.exitConfirmed = true;
			this.modalBus.$emit('close');
		},
		async onCancel() {
			const deleteConfirmed = await this.confirmMessage(
				'',
				this.$locale.baseText('onboardingCallSignupModal.confirmExit.title'),
				null,
				this.$locale.baseText('generic.yes'),
				this.$locale.baseText('generic.no'),
			);
			this.exitConfirmed = deleteConfirmed;
			if (deleteConfirmed) {
				this.modalBus.$emit('close');
			}
		},
		onModalClose() {
			return this.exitConfirmed;
		},
	},
});
</script>

<style lang="scss" module>
.buttonsContainer {
	display: flex;
	justify-content: flex-end;
	column-gap: var(--spacing-xs);
}
</style>
