<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';

import { useUsersStore } from '@/stores/users.store';
import { useCollaborationStore } from '../collaboration.store';

import { N8nUserStack } from '@n8n/design-system';
const collaborationStore = useCollaborationStore();
const usersStore = useUsersStore();

const visibility = useDocumentVisibility();
watch(visibility, (visibilityState) => {
	if (visibilityState === 'hidden') {
		collaborationStore.stopHeartbeat();
	} else {
		collaborationStore.startHeartbeat();
	}
});

const showUserStack = computed(() => collaborationStore.collaborators.length > 1);

const collaboratorsSorted = computed(() => {
	const users = collaborationStore.collaborators.map(({ user }) => user);
	// Move the current user to the first position, if not already there.
	const index = users.findIndex((user) => user.id === usersStore.currentUser?.id);
	if (index < 1) return { defaultGroup: users };
	const [currentUser] = users.splice(index, 1);
	return { defaultGroup: [currentUser, ...users] };
});

const currentUserEmail = computed(() => usersStore.currentUser?.email);

onMounted(() => {
	collaborationStore.initialize();
});

onBeforeUnmount(() => {
	collaborationStore.terminate();
});
</script>

<template>
	<div
		:class="`collaboration-pane-container ${$style.container}`"
		data-test-id="collaboration-pane"
	>
		<N8nUserStack
			v-if="showUserStack"
			:users="collaboratorsSorted"
			:current-user-email="currentUserEmail"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	margin: 0 var(--spacing--4xs);
}
</style>
