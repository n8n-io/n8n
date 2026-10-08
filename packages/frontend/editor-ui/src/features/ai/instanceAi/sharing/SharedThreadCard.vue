<script setup lang="ts">
/**
 * An n8n Assistant card in a chat that can be shared. The owner gets the card as it is. A
 * teammate gets it with a footer that says who the answer runs as, or why the teammate
 * cannot answer. A card for the owner only shows only its request to a teammate, because
 * its controls (setup forms, domain access) would do nothing.
 */
import { computed } from 'vue';
import type { InstanceAiConfirmRequest, SharedCard } from '@n8n/api-types';
import { N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AssistantConfirmationInput } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import InstanceAiConfirmationCard from '../components/agentsChat/InstanceAiConfirmationCard.vue';
import { useOptionalThreadSharing } from './threadSharingContext';
import { useSharingText } from './useSharingText';

const props = defineProps<{
	input: AssistantConfirmationInput;
	/** The tool call behind the card. The teammate rules read it. */
	call?: SharedCard;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: InstanceAiConfirmRequest];
}>();

const i18n = useI18n();
const text = useSharingText();
const sharing = useOptionalThreadSharing();

const access = computed(() => sharing?.cardAccess(props.call));
const owner = computed(() => text.owner(sharing?.view.value.ownerName ?? ''));

const footer = computed(() => {
	switch (access.value) {
		case 'answer':
			return {
				icon: 'user' as const,
				text: i18n.baseText('instanceAi.sharing.runsAs', { interpolate: { owner: owner.value } }),
			};
		case 'needs-role':
			return {
				icon: 'lock' as const,
				text: i18n.baseText('instanceAi.sharing.needsRole', {
					interpolate: { project: text.project(sharing?.view.value.projectName ?? '') },
				}),
			};
		default:
			return {
				icon: 'lock' as const,
				text: i18n.baseText('instanceAi.sharing.ownerOnly', {
					interpolate: { owner: owner.value },
				}),
			};
	}
});

/** What an owner-only card asks for, for a teammate who sees only the request. */
const request = computed(
	() =>
		props.input.introMessage?.trim() ||
		props.input.message.trim() ||
		i18n.baseText('instanceAi.sharing.waitingForOwner', { interpolate: { owner: owner.value } }),
);
</script>

<template>
	<InstanceAiConfirmationCard
		v-if="access === undefined"
		:input="input"
		:disabled="disabled"
		@submit="emit('submit', $event)"
	/>
	<div v-else :class="$style.sharedCard" data-test-id="instance-ai-shared-card">
		<N8nCard v-if="access === 'owner-only'" data-test-id="instance-ai-shared-card-request">
			<N8nText tag="p" :class="$style.request">{{ request }}</N8nText>
		</N8nCard>
		<InstanceAiConfirmationCard
			v-else
			:input="input"
			:disabled="disabled || access === 'needs-role'"
			@submit="emit('submit', $event)"
		/>
		<p :class="$style.footer" data-test-id="instance-ai-shared-card-footer">
			<N8nIcon :icon="footer.icon" size="small" aria-hidden="true" />
			<N8nText tag="span" size="small" color="text-base">{{ footer.text }}</N8nText>
		</p>
	</div>
</template>

<style lang="scss" module>
.sharedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.request {
	margin: 0;
	white-space: pre-wrap;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin: 0;
	padding-inline: var(--spacing--2xs);
	color: var(--text-color--subtle);
}
</style>
