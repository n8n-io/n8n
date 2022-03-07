<template>
	<Modal
		:name="INVITE_USER_MODAL_KEY"
		@enter="onSubmit"
		:title="$locale.baseText('INVITE_NEW_USERS')"
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
import { IFormInputs, IInviteResponse } from "@/Interface";
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
					label: this.$locale.baseText('NEW_EMAILS_TO_INVITE'),
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
					label: this.$locale.baseText('ROLE'),
					required: true,
					type: 'select',
					options: [
						{
							value: ROLE.Member,
							label: this.$locale.baseText('MEMBER_ROLE'),
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
				return this.$locale.baseText('INVITE_X_USER', { interpolate: { count: this.emailsCount }});
			}

			return this.$locale.baseText('INVITE_USER');
		},
		enabledButton(): boolean {
			return this.emailsCount >= 1;
		},
	},
	methods: {
		validateEmails(value: string) {
			value.split(',').forEach((email: string) => {
				const parsed = getEmail(email);

				if (!!parsed.trim() && !VALID_EMAIL_REGEX.test(String(parsed).trim().toLowerCase())) {
					throw new Error(this.$locale.baseText('INVALID_EMAIL_ERROR', { interpolate: { email: parsed }}));
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
					throw new Error(this.$locale.baseText('NO_USERS_TO_INVITE'));
				}

				const invited: IInviteResponse[] = await this.$store.dispatch('users/inviteUsers', emails);
				const invitedEmails = invited.reduce((accu, {user, error}) => {
					if (error) {
						accu.error.push(user.email);
					}
					else {
						accu.success.push(user.email);
					}
					return accu;
				}, {
					success: [] as string[],
					error: [] as string[],
				});

				if (invitedEmails.success.length) {
					this.$showMessage({
						type: 'success',
						title: this.$locale.baseText(invitedEmails.success.length > 1 ? 'USERS_INVITED_SUCCESS' : 'USER_INVITED_SUCCESS'),
						message: this.$locale.baseText('EMAIL_INVITES_SENT', { interpolate: { emails: invitedEmails.success.join(', ') }}),
					});
				}

				if (invitedEmails.error.length) {
					setTimeout(() => {
						this.$showMessage({
							type: 'error',
							title: this.$locale.baseText(invitedEmails.error.length > 1 ? 'USERS_INVITED_ERROR': 'USER_INVITED_ERROR'),
							message: this.$locale.baseText('EMAIL_INVITES_SENT_ERROR', { interpolate: { emails: invitedEmails.error.join(', ') }}),
						});
					}, 0); // notifications stack on top of each other otherwise
				}

				this.modalBus.$emit('close');

			} catch (error) {
				this.$showError(error, this.$locale.baseText('USERS_INVITED_ERROR'));
			}
			this.loading = false;
		},
		onSubmitClick() {
			this.formBus.$emit('submit');
		},
	},
});

</script>
