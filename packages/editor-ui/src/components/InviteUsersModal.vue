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
			<n8n-button :loading="loading" :disabled="!enabledButton" :label="buttonLabel" @click="onSubmitClick" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IFormInputs } from "@/Interface";
import { ROLE } from "@/constants";

export default mixins(showMessage).extend({
	components: { Modal },
	name: "InviteUsersModal",
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
			{
				name: 'role',
				initialValue: 'member',
				properties: {
					label: 'Role',
					required: true,
					type: 'select',
					options: [
						{
							value: ROLE.Member,
							label: 'Member',
						},
					],
				},
			},
		]];
	},
	computed: {
		emailsCount(): number {
			return this.emails.split(',').filter((email: string) => !!email.trim()).length;
		},
		buttonLabel(): string {
			if (this.emailsCount > 1) {
				return `Invite ${this.emailsCount} users`;
			}

			return 'Invite user';
		},
		enabledButton(): boolean {
			return this.emailsCount >= 1;
		},
	},
	methods: {
		onInput(e: {name: string, value: string}) {
			if (e.name === 'emails') {
				this.emails = e.value;
			}
		},
		async onSubmit() {
			try {
				this.loading = true;

				const emails = this.emails.split(',')
					.map((email) => email.trim())
					.filter((email) => !!email);

				if (emails.length === 0) {
					throw new Error('No users to invite');
				}

				await this.$store.dispatch('users/inviteUsers', {emails, role: ROLE.Member});

				this.$showMessage({
					type: 'success',
					title: `User${emails.length > 1 ? 's' : ''} invited successfully`,
					message: `An invite email was sent to ${emails.join(',')}`,
				});

				this.modalBus.$emit('close');

			} catch (error) {
				this.$showError(error, 'Problem while inviting users');
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.$emit('submit');
		},
	},
});

</script>
