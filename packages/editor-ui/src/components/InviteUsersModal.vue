<template>
	<Modal
		:name="INVITE_USER_MODAL_KEY"
		@enter="onSubmit"
		:title="
			$locale.baseText(
				showInviteUrls ? 'settings.users.copyInviteUrls' : 'settings.users.inviteNewUsers',
			)
		"
		:center="true"
		width="460px"
		:eventBus="modalBus"
	>
		<template #content>
			<div v-if="showInviteUrls">
				<n8n-users-list :users="invitedUsers">
					<template #actions="{ user }">
						<n8n-tooltip>
							<template #content>
								{{ $locale.baseText('settings.users.inviteLink.copy') }}
							</template>
							<n8n-icon-button
								icon="link"
								type="tertiary"
								data-test-id="copy-invite-link-button"
								:data-invite-link="user.inviteAcceptUrl"
								@click="onCopyInviteLink(user)"
							></n8n-icon-button>
						</n8n-tooltip>
					</template>
				</n8n-users-list>
			</div>
			<n8n-form-inputs
				v-else
				:inputs="config"
				:eventBus="formBus"
				:columnView="true"
				@input="onInput"
				@submit="onSubmit"
			/>
			<n8n-info-tip v-if="!settingsStore.isSmtpSetup" class="mt-s">
				<i18n path="settings.users.setupSMTPInfo">
					<template #link>
						<a
							href="https://docs.n8n.io/reference/user-management.html#step-one-smtp"
							target="_blank"
						>
							{{ $locale.baseText('settings.users.setupSMTPInfo.link') }}
						</a>
					</template>
				</i18n>
			</n8n-info-tip>
		</template>
		<template v-if="!showInviteUrls" #footer>
			<n8n-button
				:loading="loading"
				:disabled="!enabledButton"
				:label="buttonLabel"
				@click="onSubmitClick"
				float="right"
			/>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { useToast } from '@/composables';
import { copyPaste } from '@/mixins/copyPaste';
import Modal from './Modal.vue';
import type { IFormInputs, IInviteResponse, IUser } from '@/Interface';
import { VALID_EMAIL_REGEX, INVITE_USER_MODAL_KEY } from '@/constants';
import { ROLE } from '@/utils';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { createEventBus } from '@/event-bus';

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

export default defineComponent({
	name: 'InviteUsersModal',
	mixins: [copyPaste],
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
			config: null as IFormInputs | null,
			formBus: createEventBus(),
			modalBus: createEventBus(),
			emails: '',
			showInviteUrls: null as IInviteResponse[] | null,
			loading: false,
			INVITE_USER_MODAL_KEY,
		};
	},
	mounted() {
		this.config = [
			{
				name: 'emails',
				properties: {
					label: this.$locale.baseText('settings.users.newEmailsToInvite'),
					required: true,
					validationRules: [{ name: 'VALID_EMAILS' }],
					validators: {
						VALID_EMAILS: {
							validate: this.validateEmails,
						},
					},
					placeholder: 'name1@email.com, name2@email.com, ...',
					capitalize: true,
					focusInitially: true,
				},
			},
			{
				name: 'role',
				initialValue: 'member',
				properties: {
					label: this.$locale.baseText('auth.role'),
					required: true,
					type: 'select',
					options: [
						{
							value: ROLE.Member,
							label: this.$locale.baseText('auth.roles.member'),
						},
					],
					capitalize: true,
				},
			},
		];
	},
	computed: {
		...mapStores(useUsersStore, useSettingsStore),
		emailsCount(): number {
			return this.emails.split(',').filter((email: string) => !!email.trim()).length;
		},
		buttonLabel(): string {
			if (this.emailsCount > 1) {
				return this.$locale.baseText(
					`settings.users.inviteXUser${this.settingsStore.isSmtpSetup ? '' : '.inviteUrl'}`,
					{
						interpolate: { count: this.emailsCount.toString() },
					},
				);
			}

			return this.$locale.baseText(
				`settings.users.inviteUser${this.settingsStore.isSmtpSetup ? '' : '.inviteUrl'}`,
			);
		},
		enabledButton(): boolean {
			return this.emailsCount >= 1;
		},
		invitedUsers(): IUser[] {
			return this.showInviteUrls
				? this.usersStore.allUsers.filter((user) =>
						this.showInviteUrls!.find((invite) => invite.user.id === user.id),
				  )
				: [];
		},
	},
	methods: {
		validateEmails(value: string | number | boolean | null | undefined) {
			if (typeof value !== 'string') {
				return false;
			}

			const emails = value.split(',');
			for (let i = 0; i < emails.length; i++) {
				const email = emails[i];
				const parsed = getEmail(email);

				if (!!parsed.trim() && !VALID_EMAIL_REGEX.test(String(parsed).trim().toLowerCase())) {
					return {
						messageKey: 'settings.users.invalidEmailError',
						options: { interpolate: { email: parsed } },
					};
				}
			}

			return false;
		},
		onInput(e: { name: string; value: string }) {
			if (e.name === 'emails') {
				this.emails = e.value;
			}
		},
		async onSubmit() {
			try {
				this.loading = true;

				const emails = this.emails
					.split(',')
					.map((email) => ({ email: getEmail(email) }))
					.filter((invite) => !!invite.email);

				if (emails.length === 0) {
					throw new Error(this.$locale.baseText('settings.users.noUsersToInvite'));
				}

				const invited: IInviteResponse[] = await this.usersStore.inviteUsers(emails);
				const erroredInvites = invited.filter((invite) => invite.error);
				const successfulEmailInvites = invited.filter(
					(invite) => !invite.error && invite.user.emailSent,
				);
				const successfulUrlInvites = invited.filter(
					(invite) => !invite.error && !invite.user.emailSent,
				);

				if (successfulEmailInvites.length) {
					this.showMessage({
						type: 'success',
						title: this.$locale.baseText(
							successfulEmailInvites.length > 1
								? 'settings.users.usersInvited'
								: 'settings.users.userInvited',
						),
						message: this.$locale.baseText('settings.users.emailInvitesSent', {
							interpolate: {
								emails: successfulEmailInvites.map(({ user }) => user.email).join(', '),
							},
						}),
					});
				}

				if (successfulUrlInvites.length) {
					if (successfulUrlInvites.length === 1) {
						this.copyToClipboard(successfulUrlInvites[0].user.inviteAcceptUrl);
					}

					this.showMessage({
						type: 'success',
						title: this.$locale.baseText(
							successfulUrlInvites.length > 1
								? 'settings.users.multipleInviteUrlsCreated'
								: 'settings.users.inviteUrlCreated',
						),
						message: this.$locale.baseText(
							successfulUrlInvites.length > 1
								? 'settings.users.multipleInviteUrlsCreated.message'
								: 'settings.users.inviteUrlCreated.message',
							{
								interpolate: {
									emails: successfulUrlInvites.map(({ user }) => user.email).join(', '),
								},
							},
						),
					});
				}

				if (erroredInvites.length) {
					setTimeout(() => {
						this.showMessage({
							type: 'error',
							title: this.$locale.baseText('settings.users.usersEmailedError'),
							message: this.$locale.baseText('settings.users.emailInvitesSentError', {
								interpolate: { emails: erroredInvites.map(({ error }) => error).join(', ') },
							}),
						});
					}, 0); // notifications stack on top of each other otherwise
				}

				if (successfulUrlInvites.length > 1) {
					this.showInviteUrls = successfulUrlInvites;
				} else {
					this.modalBus.emit('close');
				}
			} catch (error) {
				this.showError(error, this.$locale.baseText('settings.users.usersInvitedError'));
			}
			this.loading = false;
		},
		showCopyInviteLinkToast(successfulUrlInvites: IInviteResponse[]) {
			this.showMessage({
				type: 'success',
				title: this.$locale.baseText(
					successfulUrlInvites.length > 1
						? 'settings.users.multipleInviteUrlsCreated'
						: 'settings.users.inviteUrlCreated',
				),
				message: this.$locale.baseText(
					successfulUrlInvites.length > 1
						? 'settings.users.multipleInviteUrlsCreated.message'
						: 'settings.users.inviteUrlCreated.message',
					{
						interpolate: {
							emails: successfulUrlInvites.map(({ user }) => user.email).join(', '),
						},
					},
				),
			});
		},
		onSubmitClick() {
			this.formBus.emit('submit');
		},
		onCopyInviteLink(user: IUser) {
			if (user.inviteAcceptUrl && this.showInviteUrls) {
				this.copyToClipboard(user.inviteAcceptUrl);
				this.showCopyInviteLinkToast([]);
			}
		},
	},
});
</script>
