<template>
	<Modal
		:name="modalName"
		@enter="onSubmit"
		title="Invite new users"
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
			<n8n-button :loading="loading" :label="buttonLabel" @click="onSubmitClick" float="right" />
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
			config: null as IFormInputs | null,
			formBus: new Vue(),
			modalBus: new Vue(),
			password: '',
			emails: '',
			loading: false,
		};
	},
	mounted() {
		this.config = [[
			{
				name: 'emails',
				properties: {
					label: 'New user email address(es)',
					required: true,
					validationRules: [{name: 'VALID_EMAILS'}],
					placeholder: 'name1@email.com, name2@email.com, ...',
				},
			},
		]];
	},
	computed: {
		buttonLabel(): string {
			const emailsCount = this.emails.split(',').filter((email: string) => !!email.trim());
			if (emailsCount.length > 1) {
				return `Invite ${emailsCount.length} users`;
			}

			return 'Invite user';
		},
	},
	methods: {
		onInput(e: {name: string, value: string}) {
			if (e.name === 'emails') {
				this.emails = e.value;
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
				this.$showError(error, 'Problem changing the password', 'There was a problem while trying to change the password:');
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.$emit('submit');
		},
	},
});

</script>
