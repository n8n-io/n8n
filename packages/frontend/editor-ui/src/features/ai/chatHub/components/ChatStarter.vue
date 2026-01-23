<script setup lang="ts">
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { EnterpriseEditionFeature } from '@/app/constants';
import { INVITE_USER_MODAL_KEY } from '@/features/settings/users/users.constants';
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
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { ROLE } from '@n8n/api-types';

defineProps<{
	showWelcomeScreen: boolean;
}>();

const emit = defineEmits<{
	startNewChat: [];
}>();

const uiStore = useUIStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const { goToUpgrade } = usePageRedirectionHelper();

const CHAT_USERS_DOCS_URL = 'https://docs.n8n.io/advanced-ai/chat-hub/#chat-user-role';

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
	<Transition name="welcome-fade" mode="out-in">
		<div v-if="showWelcomeScreen" key="welcome" :class="$style.welcomeContent">
			<div :class="$style.header">
				<N8nHeading tag="h2" bold size="xlarge">
					{{ i18n.baseText('chatHub.welcome.header') }}
				</N8nHeading>
				<N8nText size="large" color="text-light">
					{{ i18n.baseText('chatHub.welcome.subtitle') }}
				</N8nText>
			</div>

			<div :class="$style.cardGrid">
				<div
					data-test-id="welcome-card-workflow-agents"
					:class="[$style.cardWrapper, $style.cardFirst]"
				>
					<N8nCard :class="$style.card">
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
				</div>

				<div
					:class="[$style.cardWrapper, $style.cardMiddle]"
					data-test-id="welcome-card-personal-agents"
				>
					<N8nCard :class="$style.card">
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
				</div>

				<div :class="[$style.cardWrapper, $style.cardLast]" data-test-id="welcome-card-base-models">
					<N8nCard :class="$style.card">
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
							<template #docsLink>
								<N8nLink size="small" :href="CHAT_USERS_DOCS_URL" target="_blank" rel="noopener">
									{{ i18n.baseText('chatHub.welcome.inviteUpgrade.here') }}
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
		</div>
	</Transition>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: var(--spacing--xs);
}

.cardGrid {
	display: flex;
	max-width: 700px;

	@include mixins.breakpoint('sm-and-down') {
		flex-direction: column;
	}
}

.cardWrapper {
	flex: 1;
	text-decoration: none;
	color: inherit;

	&:not(:first-child) {
		margin-left: -1px;
	}

	@include mixins.breakpoint('sm-and-down') {
		&:not(:first-child) {
			margin-left: 0;
			margin-top: -1px;
		}
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

.welcomeContent {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	z-index: 100;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xl);
	background-color: var(--color--background--light-2);
}
</style>

<style lang="scss">
.welcome-fade-enter-active,
.welcome-fade-leave-active {
	transition: opacity 0.2s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
	opacity: 0;
}
</style>
