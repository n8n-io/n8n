<template>
	<Modal
		:name="CHANGE_PASSWORD_MODAL_KEY"
		@enter="onSubmit"
		:title="$locale.baseText('auth.changePassword')"
		:center="true"
		width="460px"
		:eventBus="modalBus"
	>
		<template #content>
			<n8n-form-inputs
				:inputs="config"
				:eventBus="formBus"
				:columnView="true"
				@input="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template #footer>
			<n8n-button
				:loading="loading"
				:label="$locale.baseText('auth.changePassword')"
				@click="onSubmitClick"
				float="right"
				data-test-id="change-password-button"
			/>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { CHANGE_PASSWORD_MODAL_KEY, MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH } from '../constants';
import { useToast } from '@/composables';
import Modal from '@/components/Modal.vue';
import type { IFormInputs } from '@/Interface';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from 'n8n-design-system';

export default defineComponent({
	name: 'ChangePasswordModal',
	components: { Modal },
	props: {
		modalName: {
			type: String,
		},
	},
	setup() {
		return {
			...useToast(),
		};
	},
	data() {
		return {
			config: null as null | IFormInputs,
			formBus: createEventBus(),
			modalBus: createEventBus(),
			password: '',
			loading: false,
			CHANGE_PASSWORD_MODAL_KEY,
		};
	},
	computed: {
		...mapStores(useUsersStore),
	},
	mounted() {
		const form: IFormInputs = [
			{
				name: 'currentPassword',
				properties: {
					label: this.$locale.baseText('auth.changePassword.currentPassword'),
					type: 'password',
					required: true,
					autocomplete: 'current-password',
					capitalize: true,
					focusInitially: true,
				},
			},
			{
				name: 'password',
				properties: {
					label: this.$locale.baseText('auth.newPassword'),
					type: 'password',
					required: true,
					validationRules: [{ name: 'DEFAULT_PASSWORD_RULES' }],
					infoText: this.$locale.baseText('auth.defaultPasswordRequirements'),
					autocomplete: 'new-password',
					capitalize: true,
				},
			},
			{
				name: 'password2',
				properties: {
					label: this.$locale.baseText('auth.changePassword.reenterNewPassword'),
					type: 'password',
					required: true,
					validators: {
						TWO_PASSWORDS_MATCH: {
							validate: this.passwordsMatch,
						},
					},
					validationRules: [{ name: 'TWO_PASSWORDS_MATCH' }],
					autocomplete: 'new-password',
					capitalize: true,
				},
			},
		];

		if (this.usersStore.mfaEnabled) {
			form.push({
				name: 'token',
				initialValue: '',
				properties: {
					required: true,
					label: this.$locale.baseText('mfa.code.input.label'),
					placeholder: this.$locale.baseText('mfa.code.input.placeholder'),
					maxlength: MFA_AUTHENTICATION_TOKEN_INPUT_MAX_LENGTH,
					capitalize: true,
					validateOnBlur: true,
				},
			});
		}

		this.config = form;
	},
	methods: {
		passwordsMatch(value: string | number | boolean | null | undefined) {
			if (typeof value !== 'string') {
				return false;
			}

			if (value !== this.password) {
				return {
					messageKey: 'auth.changePassword.passwordsMustMatchError',
				};
			}

			return false;
		},
		onInput(e: { name: string; value: string }) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		async onSubmit(values: { currentPassword: string; password: string; token: string }) {
			try {
				this.loading = true;
				await this.usersStore.updateCurrentUserPassword(values);

				this.showMessage({
					type: 'success',
					title: this.$locale.baseText('auth.changePassword.passwordUpdated'),
					message: this.$locale.baseText('auth.changePassword.passwordUpdatedMessage'),
				});

				this.modalBus.emit('close');
			} catch (error) {
				this.showError(error, this.$locale.baseText('auth.changePassword.error'));
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.emit('submit');
		},
	},
});
</script>
