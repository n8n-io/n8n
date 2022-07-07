<template>
	<Modal
		:name="ONBOARDING_CALL_SIGNUP_MODAL_KEY"
		:title="$locale.baseText('onboardingCallSignupModal.title')"
		:eventBus="modalBus"
		:center="true"
		width="460px"
	>
		<template slot="content">
			<div class="pb-m">
				<n8n-text>
					{{ $locale.baseText('onboardingCallSignupModal.description') }}
				</n8n-text>
			</div>
			<div @keyup.enter="signup">
				<n8n-input v-model="email" :placeholder="$locale.baseText('onboardingCallSignupModal.emailInput.placeholder')" />
				<div v-if="showError" :class="[$style.error, 'mt-4xs']">
					<n8n-text size="small">
						{{ $locale.baseText('onboardingCallSignupModal.infoText.emailError') }}
					</n8n-text>
				</div>
			</div>
		</template>
		<template slot="footer">
			<n8n-button
				:disabled="email === ''"
				:label="$locale.baseText('onboardingCallSignupModal.signupButton.label')"
				size="large"
				float="right"
				@click="signup"
			/>
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
		};
	},
	computed: {
		isEmailValid(): boolean {
			return VALID_EMAIL_REGEX.test(String(this.email).toLowerCase());
		},
	},
	methods: {
		signup() {
			if(this.isEmailValid) {
				this.showError = false;
				// TODO: Submit email here
				this.$showMessage({
					type: 'success',
					title: this.$locale.baseText('onboardingCallSignupSucess.title'),
				});
				this.modalBus.$emit('close');
			}else {
				this.showError = true;
			}
		},
	},
});
</script>

<style lang="scss" module>
.error {
	color: var(--color-danger);
}
</style>
