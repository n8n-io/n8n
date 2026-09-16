<script setup lang="ts">
import { computed } from 'vue';

import { N8nCallout, N8nButton, N8nUserStack } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { useUsersStore } from '@n8n/stores/users.store';
import { useAgentCollaborationStore } from '../stores/agentCollaboration.store';

const locale = useI18n();
const usersStore = useUsersStore();
const agentCollaborationStore = useAgentCollaborationStore();

const showBanner = computed(
	() => agentCollaborationStore.isAnyoneWriting && !agentCollaborationStore.isCurrentTabWriter,
);

const writerName = computed(() => {
	// Try the collaborators list first (populated by collaboratorsChanged).
	const collaborator = agentCollaborationStore.currentWriter?.user;
	if (collaborator) {
		return (
			[collaborator.firstName, collaborator.lastName].filter(Boolean).join(' ') ||
			collaborator.email
		);
	}
	// collaboratorsChanged may not have arrived yet (e.g. the lock was
	// restored from the backend before the push event). Fall back to
	// the users store, then to an empty string so the caller can use
	// the localized fallback.
	const lockUserId = agentCollaborationStore.currentWriterLock?.userId;
	if (lockUserId) {
		const u = usersStore.usersById[lockUserId];
		if (u) return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
	}
	return '';
});

const bannerMessage = computed(() => {
	if (agentCollaborationStore.isCurrentUserWriter) {
		return locale.baseText('agents.builder.collaboration.banner.readOnly.sameUser');
	}
	const name = writerName.value;
	if (!name) {
		return locale.baseText('agents.builder.collaboration.banner.readOnly.differentUserFallback');
	}
	return locale.baseText('agents.builder.collaboration.banner.readOnly.differentUser', {
		interpolate: { name },
	});
});

const tooltip = computed(() => {
	if (agentCollaborationStore.isCurrentUserWriter) {
		return locale.baseText('agents.builder.collaboration.banner.tooltip.youOtherTab');
	}
	const name = writerName.value;
	if (!name) {
		return locale.baseText('agents.builder.collaboration.banner.tooltip.otherUserFallback');
	}
	return locale.baseText('agents.builder.collaboration.banner.tooltip.otherUser', {
		interpolate: { name },
	});
});

const collaboratorsSorted = computed(() => {
	const users = agentCollaborationStore.collaborators.map(({ user }) => user);
	const index = users.findIndex((user) => user.id === usersStore.currentUser?.id);
	if (index < 1) return { defaultGroup: users };
	const [currentUser] = users.splice(index, 1);
	return { defaultGroup: [currentUser, ...users] };
});

const currentUserEmail = computed(() => usersStore.currentUser?.email ?? '');

function onTakeOver() {
	// Steal the lock — only allowed when the same user holds it from another tab.
	agentCollaborationStore.requestWriteAccessForce();
}
</script>

<template>
	<div v-if="showBanner" data-test-id="agent-collaboration-banner">
		<N8nCallout theme="warning" :icon-tooltip="tooltip" :round-corners="false">
			{{ bannerMessage }}
			<template #actions>
				<N8nButton
					v-if="agentCollaborationStore.isCurrentUserWriter"
					size="small"
					data-test-id="agent-collaboration-take-over"
					@click="onTakeOver"
				>
					{{ locale.baseText('agents.builder.collaboration.banner.takeOver') }}
				</N8nButton>
			</template>
			<template #trailingContent>
				<N8nUserStack
					v-if="collaboratorsSorted.defaultGroup.length > 0"
					:users="collaboratorsSorted"
					:current-user-email="currentUserEmail"
				/>
			</template>
		</N8nCallout>
	</div>
</template>
