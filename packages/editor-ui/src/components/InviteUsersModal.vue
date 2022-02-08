<template>
	<Modal
		:name="INVITE_USER_MODAL_KEY"
		@enter="onSubmit"
		title="Invite new users"
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
			<n8n-button :loading="loading" :disabled="!enabledButton" :label="buttonLabel" @click="onSubmitClick" float="right" />
		</template>
	</Modal>
</template>


<script lang="ts">
import mixins from "vue-typed-mixins";

import { showMessage } from "@/components/mixins/showMessage";
import Modal from "./Modal.vue";
import Vue from "vue";
import { IFormInputs, IUserResponse } from "@/Interface";
import { VALID_EMAIL_REGEX, INVITE_USER_MODAL_KEY } from "@/constants";
import { ROLE } from "@/modules/userHelpers";

const NAME_EMAIL_FORMAT_REGEX = /^.* <(.*)>$/;


function getEmail(email: string): string {
	let parsed = email.trim();
	if (NAME_EMAIL_FORMAT_REGEX.test(parsed)) {
		const matches = parsed.match(NAME_EMAIL_FORMAT_REGEX);
		if (matches && matches.length === 2) {
			parsed = matches[1];
		}
	}
	return parsed;
}

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
			INVITE_USER_MODAL_KEY,
		};
	},
	mounted() {
		this.config = [
			{
				name: 'emails',
				properties: {
					label: 'New user email address(es)',
					required: true,
					validationRules: [{name: 'VALID_EMAILS'}],
					validators: {
						VALID_EMAILS: {
							validate: this.validateEmails,
						},
					},
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
		];
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
		validateEmails: (value: string) => {
			value.split(',').forEach((email: string) => {
				const parsed = getEmail(email);

				if (!!parsed.trim() && !VALID_EMAIL_REGEX.test(String(parsed).trim().toLowerCase())) {
					throw new Error(`"${parsed.trim()}" is not a valid email`);
				}
			});
		},
		onInput(e: {name: string, value: string}) {
			if (e.name === 'emails') {
				this.emails = e.value;
			}
		},
		async onSubmit() {
			try {
				this.loading = true;

				const emails = this.emails.split(',')
					.map((email) => ({email: getEmail(email)}))
					.filter((invite) => !!invite.email);

				if (emails.length === 0) {
					throw new Error('No users to invite');
				}

				const invited: Array<Partial<IUserResponse>> = await this.$store.dispatch('users/inviteUsers', emails);
				const invitedEmails = invited.reduce((accu, user) => {
					if (user.email) {
						return accu ? `${accu}, ${user.email}` : user.email;
					}
					return accu;
				}, '');

				this.$showMessage({
					type: 'success',
					title: `User${invited.length > 1 ? 's' : ''} invited successfully`,
					message: `An invite email was sent to ${invitedEmails}`,
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
