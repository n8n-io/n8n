<script setup lang="ts">
/** How the number appears to customers in WhatsApp, from its business profile in Meta. */
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { AgentJsonConfig, WhatsAppBusinessProfile } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';

const props = withDefaults(
	defineProps<{
		/** Null until the credential is verified with Meta. */
		profile: WhatsAppBusinessProfile | null;
		personalisation?: AgentJsonConfig['personalisation'] | null;
		ready?: boolean;
		loading?: boolean;
		/** Hidden in the settings, where the channel is already connected. */
		showConnect?: boolean;
		/** Only in the settings, where the profile can no longer be edited from here. */
		showManagerLink?: boolean;
	}>(),
	{
		personalisation: null,
		ready: false,
		loading: false,
		showConnect: false,
		showManagerLink: false,
	},
);

const emit = defineEmits<{ connect: []; openManager: [] }>();

/** The profile is edited in Meta, not in n8n. */
const WHATSAPP_MANAGER_URL = 'https://business.facebook.com/latest/whatsapp_manager/phone_numbers/';

const i18n = useI18n();

// The picture is a Meta CDN URL that can expire or be blocked, so fall back to the agent icon.
const pictureFailed = ref(false);
watch(
	() => props.profile?.profilePictureUrl,
	() => (pictureFailed.value = false),
);

const pictureUrl = computed(() =>
	pictureFailed.value ? undefined : props.profile?.profilePictureUrl,
);

const name = computed(
	() =>
		props.profile?.verifiedName ??
		i18n.baseText('agents.channels.whatsapp.setup.connect.pendingName'),
);

const subtitle = computed(() => {
	if (!props.profile) {
		return i18n.baseText('agents.channels.whatsapp.setup.connect.pendingProfile');
	}
	return [props.profile.displayPhoneNumber, props.profile.description].filter(Boolean).join(' · ');
});
</script>

<template>
	<div
		:class="[
			$style.identity,
			{ [$style.identityReady]: ready, [$style.locked]: showConnect && !ready },
		]"
		data-testid="whatsapp-identity"
	>
		<img
			v-if="pictureUrl"
			:src="pictureUrl"
			:class="$style.avatar"
			alt=""
			referrerpolicy="no-referrer"
			data-testid="whatsapp-identity-avatar"
			@error="pictureFailed = true"
		/>
		<AgentPersonalisationIcon v-else :personalisation="personalisation" :size="36" />
		<div :class="$style.identityText">
			<N8nText size="small" bold data-testid="whatsapp-identity-name">
				{{ name }}
				<N8nTooltip
					:content="i18n.baseText('agents.channels.whatsapp.setup.connect.identityTooltip')"
				>
					<N8nIcon icon="info" size="xsmall" :class="$style.hint" />
				</N8nTooltip>
			</N8nText>
			<N8nText size="small" :class="$style.hint" data-testid="whatsapp-identity-description">
				{{ subtitle }}
			</N8nText>
		</div>
		<N8nButton
			v-if="showManagerLink"
			:href="WHATSAPP_MANAGER_URL"
			target="_blank"
			variant="outline"
			size="medium"
			data-testid="whatsapp-manager-link"
			@click="emit('openManager')"
		>
			{{ i18n.baseText('agents.channels.whatsapp.settings.editInManager') }}
			<N8nIcon icon="arrow-up-right" size="small" />
		</N8nButton>
		<N8nButton
			v-if="showConnect"
			:variant="ready ? 'solid' : 'outline'"
			size="medium"
			:disabled="!ready || loading"
			:loading="loading"
			data-testid="whatsapp-connect"
			@click="emit('connect')"
		>
			{{ i18n.baseText('agents.channels.whatsapp.setup.connect.button') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
}

/* Same treatment as the Teams identity card, one step off the modal in both themes. */
.identityReady {
	background: light-dark(var(--color--neutral-50), var(--color--white-alpha-50));
	border-color: light-dark(var(--border-color--subtle), var(--border-color));
}

.locked {
	opacity: 0.45;
}

.avatar {
	width: 36px;
	height: 36px;
	flex: none;
	border-radius: 50%;
	object-fit: cover;
}

.identityText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.hint {
	color: var(--text-color--subtler);
}
</style>
