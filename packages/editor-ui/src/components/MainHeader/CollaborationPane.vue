<script setup lang="ts">
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { onBeforeUnmount, onMounted, computed, ref } from 'vue';
import { TIME } from '@/constants';
import { isUserGlobalOwner } from '@/utils/userUtils';

const collaborationStore = useCollaborationStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();

const HEARTBEAT_INTERVAL = 5 * TIME.MINUTE;
const heartbeatTimer = ref<number | null>(null);

const activeUsersSorted = computed(() => {
	const currentWorkflowUsers = (collaborationStore.getUsersForCurrentWorkflow ?? []).map(
		(userInfo) => userInfo.user,
	);
	const owner = currentWorkflowUsers.find(isUserGlobalOwner);
	return {
		defaultGroup: owner
			? [owner, ...currentWorkflowUsers.filter((user) => user.id !== owner.id)]
			: currentWorkflowUsers,
	};
});

const currentUserEmail = computed(() => {
	return usersStore.currentUser?.email;
});

const startHeartbeat = () => {
	if (heartbeatTimer.value !== null) {
		clearInterval(heartbeatTimer.value);
		heartbeatTimer.value = null;
	}
	heartbeatTimer.value = window.setInterval(() => {
		collaborationStore.notifyWorkflowOpened(workflowsStore.workflow.id);
	}, HEARTBEAT_INTERVAL);
};

const stopHeartbeat = () => {
	if (heartbeatTimer.value !== null) {
		clearInterval(heartbeatTimer.value);
	}
};

const onDocumentVisibilityChange = () => {
	if (document.visibilityState === 'hidden') {
		stopHeartbeat();
	} else {
		startHeartbeat();
	}
};

onMounted(() => {
	collaborationStore.initialize();
	startHeartbeat();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
	stopHeartbeat();
	collaborationStore.terminate();
});
</script>

<template>
	<div
		:class="`collaboration-pane-container ${$style.container}`"
		data-test-id="collaboration-pane"
	>
		<n8n-user-stack :users="activeUsersSorted" :current-user-email="currentUserEmail" />
	</div>
</template>

<style lang="scss" module>
.container {
	margin: 0 var(--spacing-4xs);
}
</style>
