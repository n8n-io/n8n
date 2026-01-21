<script setup lang="ts">
import { useUsersStore } from '@/features/settings/users/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { EnterpriseEditionFeature } from '@/app/constants';
import { INVITE_USER_MODAL_KEY } from '@/features/settings/users/users.constants';
import {
	CHAT_WORKFLOW_AGENTS_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import {
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nLink,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { I18nT } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { ROLE } from '@n8n/api-types';

defineProps<{ isMobileDevice: boolean; showWelcomeScreen: boolean }>();

const emit = defineEmits<{
	startNewChat: [];
}>();

const userStore = useUsersStore();
const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

const greetings = computed(() => {
	const name =
		userStore.currentUser?.firstName ??
		userStore.currentUser?.fullName ??
		i18n.baseText('chatHub.chat.greeting.fallback');
	return i18n.baseText('chatHub.chat.greeting', { interpolate: { name } });
});

const isAdvancedPermissionsEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedPermissions],
);

const hasInvitePermission = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'user:create' } }),
);

const showInviteButton = computed(() => hasInvitePermission.value);
const isInviteDisabled = computed(() => !isAdvancedPermissionsEnabled.value);

function handleStartNewChat() {
	emit('startNewChat');
}

function handleInviteUsers() {
	uiStore.openModalWithData({ name: INVITE_USER_MODAL_KEY, data: { initialRole: ROLE.ChatUser } });
}

function handleUpgradeClick() {
	void goToUpgrade('chat-hub', 'upgrade-advanced-permissions');
}
</script>

<template>
	<div :class="[$style.starter, { [$style.isMobileDevice]: isMobileDevice }]">
		<template v-if="showWelcomeScreen">
			<div :class="$style.header">
				<N8nHeading tag="h2" bold size="xlarge">
					{{ i18n.baseText('chatHub.welcome.header') }}
				</N8nHeading>
				<N8nText size="large" color="text-light">
					{{ i18n.baseText('chatHub.welcome.subtitle') }}
				</N8nText>
			</div>

			<div :class="$style.cardGrid">
				<RouterLink
					:to="{ name: CHAT_WORKFLOW_AGENTS_VIEW }"
					:class="[$style.cardWrapper, $style.cardFirst]"
					data-test-id="welcome-card-workflow-agents"
				>
					<N8nCard :class="$style.card" hoverable>
						<div :class="$style.cardHeader">
							<N8nIcon icon="robot" size="large" color="text-dark" />
							<N8nText bold>{{
								i18n.baseText('chatHub.welcome.card.workflowAgents.title')
							}}</N8nText>
						</div>
						<N8nText size="small" color="text-light">{{
							i18n.baseText('chatHub.welcome.card.workflowAgents.description')
						}}</N8nText>
					</N8nCard>
				</RouterLink>

				<RouterLink
					:to="{ name: CHAT_PERSONAL_AGENTS_VIEW }"
					:class="[$style.cardWrapper, $style.cardMiddle]"
					data-test-id="welcome-card-personal-agents"
				>
					<N8nCard :class="$style.card" hoverable>
						<div :class="$style.cardHeader">
							<N8nIcon icon="message-square" size="large" color="text-dark" />
							<N8nText bold>{{
								i18n.baseText('chatHub.welcome.card.personalAgents.title')
							}}</N8nText>
						</div>
						<N8nText size="small" color="text-light">{{
							i18n.baseText('chatHub.welcome.card.personalAgents.description')
						}}</N8nText>
					</N8nCard>
				</RouterLink>

				<div
					:class="[$style.cardWrapper, $style.cardLast]"
					data-test-id="welcome-card-base-models"
					@click="handleStartNewChat"
				>
					<N8nCard :class="$style.card" hoverable>
						<div :class="$style.cardHeader">
							<div :class="$style.providerIcons">
								<CredentialIcon credential-type-name="openAiApi" :size="20" />
								<CredentialIcon credential-type-name="anthropicApi" :size="20" />
								<CredentialIcon credential-type-name="googlePalmApi" :size="20" />
							</div>
							<N8nText bold>{{ i18n.baseText('chatHub.welcome.card.baseModels.title') }}</N8nText>
						</div>
						<N8nText size="small" color="text-light">{{
							i18n.baseText('chatHub.welcome.card.baseModels.description')
						}}</N8nText>
					</N8nCard>
				</div>
			</div>

			<div :class="$style.buttonGroup">
				<N8nButton
					type="primary"
					size="medium"
					icon="plus"
					data-test-id="welcome-start-new-chat"
					@click="handleStartNewChat"
				>
					{{ i18n.baseText('chatHub.welcome.button.startNewChat') }}
				</N8nButton>

				<N8nTooltip v-if="showInviteButton" :disabled="!isInviteDisabled">
					<template #content>
						<I18nT keypath="chatHub.welcome.inviteUpgrade.tooltip" scope="global">
							<template #link>
								<N8nLink size="small" @click="handleUpgradeClick">
									{{ i18n.baseText('generic.upgrade') }}
								</N8nLink>
							</template>
						</I18nT>
					</template>
					<N8nButton
						type="secondary"
						size="medium"
						icon="users"
						:disabled="isInviteDisabled"
						data-test-id="welcome-invite-chat-users"
						@click="handleInviteUsers"
					>
						{{ i18n.baseText('chatHub.welcome.button.inviteChatUsers') }}
					</N8nButton>
				</N8nTooltip>
			</div>
		</template>

		<template v-else>
			<N8nHeading tag="h2" bold size="xlarge">
				{{ greetings }}
			</N8nHeading>
		</template>
	</div>
</template>

<style lang="scss" module>
.starter {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xl);
}

.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--xs);
}

.cardGrid {
	display: flex;
	max-width: 900px;

	@include mixins.breakpoint('sm-and-down') {
		flex-direction: column;
	}
}

.cardWrapper {
	flex: 1;
	text-decoration: none;
	color: inherit;
	cursor: pointer;

	&:not(:first-child) {
		margin-left: -1px;
	}

	@include mixins.breakpoint('sm-and-down') {
		&:not(:first-child) {
			margin-left: 0;
			margin-top: -1px;
		}
	}

	&:hover {
		z-index: 1;
	}
}

.card {
	height: 100%;
	border-radius: 0;
	padding: var(--spacing--lg);
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.cardFirst .card {
	border-radius: var(--radius--lg) 0 0 var(--radius--lg);

	@include mixins.breakpoint('sm-and-down') {
		border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	}
}

.cardMiddle .card {
	border-radius: 0;
}

.cardLast .card {
	border-radius: 0 var(--radius--lg) var(--radius--lg) 0;

	@include mixins.breakpoint('sm-and-down') {
		border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	}
}

.cardHeader {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

.providerIcons {
	display: flex;
	gap: var(--spacing--2xs);
}

.buttonGroup {
	display: flex;
	gap: var(--spacing--sm);
	justify-content: center;
}
</style>
