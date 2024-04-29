<template>
	<Modal
		:name="CHANGE_PASSWORD_MODAL_KEY"
		:title="$locale.baseText('auth.changePassword')"
		:center="true"
		width="460px"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<n8n-form-inputs
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@update="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template #footer>
			<n8n-button
				:loading="loading"
				:label="$locale.baseText('auth.changePassword')"
				float="right"
				data-test-id="change-password-button"
				@click="onSubmitClick"
			/>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { CHANGE_PASSWORD_MODAL_KEY } from '../constants';
import { useToast } from '@/composables/useToast';
import Modal from '@/components/Modal.vue';
import type { IFormInputs } from '@/Interface';
import { mapStores } from 'pinia';
import { useUsersStore } from '@/stores/users.store';
import { createEventBus } from 'n8n-design-system/utils';

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
		async onSubmit(values: { currentPassword: string; password: string }) {
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
