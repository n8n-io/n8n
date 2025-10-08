<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import Modal from './Modal.vue';
import type {
	FormFieldValueUpdate,
	IFormInputs,
	IInviteResponse,
	InvitableRoleName,
} from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { EnterpriseEditionFeature, VALID_EMAIL_REGEX, INVITE_USER_MODAL_KEY } from '@/constants';
import { ROLE } from '@n8n/api-types';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { createFormEventBus } from '@n8n/design-system/utils';
import { createEventBus } from '@n8n/utils/event-bus';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { I18nT } from 'vue-i18n';

import {
	N8nButton,
	N8nFormInputs,
	N8nIconButton,
	N8nLink,
	N8nNotice,
	N8nTooltip,
	N8nUsersList,
} from '@n8n/design-system';
const props = defineProps<{
	modalName: string;
	data: {
		afterInvite?: () => Promise<void>;
	};
}>();

const NAME_EMAIL_FORMAT_REGEX = /^.* <(.*)>$/;

const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const clipboard = useClipboard();
const { showMessage, showError } = useToast();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

const formBus = createFormEventBus();
const modalBus = createEventBus();
const config = ref<IFormInputs | null>();
const emails = ref('');
const role = ref<InvitableRoleName>(ROLE.Member);
const showInviteUrls = ref<IInviteResponse[] | null>(null);
const loading = ref(false);

onMounted(() => {
	config.value = [
		{
			name: 'emails',
			properties: {
				label: i18n.baseText('settings.users.newEmailsToInvite'),
				required: true,
				validationRules: [{ name: 'VALID_EMAILS' }],
				validators: {
					VALID_EMAILS: {
						validate: validateEmails,
					},
				},
				placeholder: 'name1@email.com, name2@email.com, ...',
				capitalize: true,
				focusInitially: true,
			},
		},
		{
			name: 'role',
			initialValue: ROLE.Member,
			properties: {
				label: i18n.baseText('auth.role'),
				required: true,
				type: 'select',
				options: [
					{
						value: ROLE.Member,
						label: i18n.baseText('auth.roles.member'),
					},
					{
						value: ROLE.Admin,
						label: i18n.baseText('auth.roles.admin'),
						disabled: !isAdvancedPermissionsEnabled.value,
					},
				],
				capitalize: true,
			},
		},
	];
});

const emailsCount = computed((): number => {
	return emails.value.split(',').filter((email: string) => !!email.trim()).length;
});

const buttonLabel = computed((): string => {
	if (emailsCount.value > 1) {
		return i18n.baseText(
			`settings.users.inviteXUser${settingsStore.isSmtpSetup ? '' : '.inviteUrl'}`,
			{
				interpolate: { count: emailsCount.value.toString() },
			},
		);
	}

	return i18n.baseText(`settings.users.inviteUser${settingsStore.isSmtpSetup ? '' : '.inviteUrl'}`);
});

const enabledButton = computed((): boolean => {
	return emailsCount.value >= 1;
});

const invitedUsers = computed((): IUser[] => {
	return showInviteUrls.value
		? usersStore.allUsers.filter((user) =>
				showInviteUrls.value?.find((invite) => invite.user.id === user.id),
			)
		: [];
});

const isAdvancedPermissionsEnabled = computed((): boolean => {
	return settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions];
});

const validateEmails = (value: string | number | boolean | null | undefined) => {
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
};

function isInvitableRoleName(val: unknown): val is InvitableRoleName {
	return typeof val === 'string' && [ROLE.Member, ROLE.Admin].includes(val as InvitableRoleName);
}

function onInput(e: FormFieldValueUpdate) {
	if (e.name === 'emails' && typeof e.value === 'string') {
		emails.value = e.value;
	}
	if (e.name === 'role' && isInvitableRoleName(e.value)) {
		role.value = e.value;
	}
}

async function onSubmit() {
	try {
		loading.value = true;

		const emailList = emails.value
			.split(',')
			.map((email) => ({ email: getEmail(email), role: role.value }))
			.filter((invite) => !!invite.email);

		if (emailList.length === 0) {
			throw new Error(i18n.baseText('settings.users.noUsersToInvite'));
		}

		const invited = await usersStore.inviteUsers(emailList);
		const erroredInvites = invited.filter((invite) => invite.error);
		const successfulEmailInvites = invited.filter(
			(invite) => !invite.error && invite.user.emailSent,
		);
		const successfulUrlInvites = invited.filter(
			(invite) => !invite.error && !invite.user.emailSent,
		);

		if (successfulEmailInvites.length) {
			showMessage({
				type: 'success',
				title: i18n.baseText(
					successfulEmailInvites.length > 1
						? 'settings.users.usersInvited'
						: 'settings.users.userInvited',
				),
				message: i18n.baseText('settings.users.emailInvitesSent', {
					interpolate: {
						emails: successfulEmailInvites.map(({ user }) => user.email).join(', '),
					},
				}),
			});
		}

		if (successfulUrlInvites.length) {
			if (successfulUrlInvites.length === 1) {
				void clipboard.copy(successfulUrlInvites[0].user.inviteAcceptUrl);
			}

			showMessage({
				type: 'success',
				title: i18n.baseText(
					successfulUrlInvites.length > 1
						? 'settings.users.multipleInviteUrlsCreated'
						: 'settings.users.inviteUrlCreated',
				),
				message: i18n.baseText(
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
				showMessage({
					type: 'error',
					title: i18n.baseText('settings.users.usersEmailedError'),
					message: i18n.baseText('settings.users.emailInvitesSentError', {
						interpolate: { emails: erroredInvites.map(({ error }) => error).join(', ') },
					}),
				});
			}, 0); // notifications stack on top of each other otherwise
		}

		if (successfulUrlInvites.length > 1) {
			showInviteUrls.value = successfulUrlInvites;
		} else {
			modalBus.emit('close');
		}

		await props.data.afterInvite?.();
	} catch (error) {
		showError(error, i18n.baseText('settings.users.usersInvitedError'));
	}
	loading.value = false;
}

function showCopyInviteLinkToast(successfulUrlInvites: IInviteResponse[]) {
	showMessage({
		type: 'success',
		title: i18n.baseText(
			successfulUrlInvites.length > 1
				? 'settings.users.multipleInviteUrlsCreated'
				: 'settings.users.inviteUrlCreated',
		),
		message: i18n.baseText(
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

function onSubmitClick() {
	formBus.emit('submit');
}

function onCopyInviteLink(user: IUser) {
	if (user.inviteAcceptUrl && showInviteUrls.value) {
		void clipboard.copy(user.inviteAcceptUrl);
		showCopyInviteLinkToast([]);
	}
}

function goToUpgradeAdvancedPermissions() {
	void goToUpgrade('advanced-permissions', 'upgrade-advanced-permissions');
}

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
</script>

<template>
	<Modal
		:name="INVITE_USER_MODAL_KEY"
		:title="
			i18n.baseText(
				showInviteUrls ? 'settings.users.copyInviteUrls' : 'settings.users.inviteNewUsers',
			)
		"
		:center="true"
		width="460px"
		:event-bus="modalBus"
		@enter="onSubmit"
	>
		<template #content>
			<N8nNotice v-if="!isAdvancedPermissionsEnabled">
				<I18nT keypath="settings.users.advancedPermissions.warning" scope="global">
					<template #link>
						<N8nLink size="small" @click="goToUpgradeAdvancedPermissions">
							{{ i18n.baseText('generic.upgrade') }}
						</N8nLink>
					</template>
				</I18nT>
			</N8nNotice>
			<div v-if="showInviteUrls">
				<N8nUsersList :users="invitedUsers">
					<template #actions="{ user }">
						<N8nTooltip>
							<template #content>
								{{ i18n.baseText('settings.users.inviteLink.copy') }}
							</template>
							<N8nIconButton
								icon="link"
								type="tertiary"
								data-test-id="copy-invite-link-button"
								:data-invite-link="user.inviteAcceptUrl"
								@click="onCopyInviteLink(user)"
							></N8nIconButton>
						</N8nTooltip>
					</template>
				</N8nUsersList>
			</div>
			<N8nFormInputs
				v-else-if="config"
				:inputs="config"
				:event-bus="formBus"
				:column-view="true"
				@update="onInput"
				@submit="onSubmit"
			/>
		</template>
		<template v-if="!showInviteUrls" #footer>
			<N8nButton
				:loading="loading"
				:disabled="!enabledButton"
				:label="buttonLabel"
				float="right"
				@click="onSubmitClick"
			/>
		</template>
	</Modal>
</template>
