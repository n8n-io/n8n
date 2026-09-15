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
	const u = agentCollaborationStore.currentWriter?.user;
	if (!u) return '';
	return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
});

const bannerMessage = computed(() => {
	if (agentCollaborationStore.isCurrentUserWriter) {
		return locale.baseText('agents.builder.collaboration.banner.readOnly.sameUser');
	}
	return locale.baseText('agents.builder.collaboration.banner.readOnly.differentUser', {
		interpolate: { name: writerName.value },
	});
});

const tooltip = computed(() => {
	if (agentCollaborationStore.isCurrentUserWriter) {
		return locale.baseText('agents.builder.collaboration.banner.tooltip.youOtherTab');
	}
	return locale.baseText('agents.builder.collaboration.banner.tooltip.otherUser', {
		interpolate: { name: writerName.value },
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
