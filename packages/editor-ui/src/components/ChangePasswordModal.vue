<template>
	<Modal
		:name="modalName"
		@enter="onSubmit"
		title="Change Password"
		:center="true"
		minWidth="460px"
		maxWidth="460px"
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
			<n8n-button :loading="loading" label="Change password" @click="onSubmitClick" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IFormInputs } from "@/Interface";

export default mixins(showMessage).extend({
	components: { Modal },
	name: "DuplicateWorkflow",
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
		};
	},
	mounted() {
		this.config = [[
			{
				name: 'password',
				properties: {
					label: 'New password',
					type: 'password',
					required: true,
					validationRules: [{name: 'DEFAULT_PASSWORD_RULES'}],
					infoText: 'At least 8 characters with 1 number and 1 uppercase',
				},
			},
			{
				name: 'password2',
				properties: {
					label: 'Re-enter new password',
					type: 'password',
					required: true,
					validators: {
						TWO_PASSWORDS_MATCH: {
							validate: this.passwordsMatch,
						},
					},
					validationRules: [{name: 'TWO_PASSWORDS_MATCH'}],
				},
			},
		]];
	},
	methods: {
		passwordsMatch(value: string) {
			if (value !== this.password) {
				throw new Error('Two passwords must match');
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
					title: 'Password updated successfully',
					message: 'You can now sign in with your new password',
				});

				this.modalBus.$emit('close');

			} catch (error) {
				this.$showError(error, 'Problem changing the password');
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.$emit('submit');
		},
	},
});

</script>
