<template>
	<Modal
		:name="CHANGE_PASSWORD_MODAL_KEY"
		@enter="onSubmit"
		:title="$locale.baseText('CHANGE_PASSWORD')"
		:center="true"
		width="460px"
		:eventBus="modalBus"
	>
		<template slot="content">
			<n8n-form-inputs
				:inputs="config"
				:eventBus="formBus"
				:columnView="true"
				@input="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template slot="footer">
			<n8n-button :loading="loading" :label="$locale.baseText('CHANGE_PASSWORD')" @click="onSubmitClick" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IFormInputs } from "@/Interface";
import { CHANGE_PASSWORD_MODAL_KEY } from '../constants';

export default mixins(showMessage).extend({
	components: { Modal },
	name: "ChangePasswordModal",
	props: {
		modalName: {
			type: String,
		},
	},
	data() {
		return {
			config: null as null | IFormInputs,
			formBus: new Vue(),
			modalBus: new Vue(),
			password: '',
			loading: false,
			CHANGE_PASSWORD_MODAL_KEY,
		};
	},
	mounted() {
		this.config = [
			{
				name: 'currentPassword',
				properties: {
					label: this.$locale.baseText('CURRENT_PASSWORD'),
					type: 'password',
					required: true,
					autocomplete: 'current-password',
				},
			},
			{
				name: 'password',
				properties: {
					label: this.$locale.baseText('NEW_PASSWORD'),
					type: 'password',
					required: true,
					validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
					infoText: this.$locale.baseText('DEFAULT_PASSWORD_REQUIREMENTS'),
					autocomplete: 'new-password',
				},
			},
			{
				name: 'password2',
				properties: {
					label: this.$locale.baseText('REENTER_NEW_PASSWORD'),
					type: 'password',
					required: true,
					validators: {
						TWO_PASSWORDS_MATCH: {
							validate: this.passwordsMatch,
						},
					},
					validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
					autocomplete: 'new-password',
				},
			},
		];
	},
	methods: {
		passwordsMatch(value: string) {
			if (value !== this.password) {
				throw new Error(this.$locale.baseText('PASSWORDS_MUST_MATCH_ERROR'));
			}
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'password') {
				this.password = e.value;
			}
		},
		async onSubmit(values: {[key: string]: string}) {
			try {
				this.loading = true;
				await this.$store.dispatch('users/updateCurrentUserPassword', values);

				this.$showMessage({
					type: 'success',
					title: this.$locale.baseText('PASSWORD_UPDATE_SUCCESS'),
					message: this.$locale.baseText('PASSWORD_UPDATE_SUCCESS_MESSAGE'),
				});

				this.modalBus.$emit('close');

			} catch (error) {
				this.$showError(error, this.$locale.baseText('PASSWORD_UPDATE_ERROR'));
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.$emit('submit');
		},
	},
});

</script>
