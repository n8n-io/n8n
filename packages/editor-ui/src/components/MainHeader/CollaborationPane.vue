<script setup lang="ts">
import { COLLABORATION_HEARTBEAT_INTERVAL } from '@/constants';
import { useCollaborationStore, useUsersStore, useWorkflowsStore } from '@/stores';
import { onBeforeUnmount } from 'vue';
import { onMounted } from 'vue';
import { computed, ref } from 'vue';

const collaborationStore = useCollaborationStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();

const heartbeatInterval = COLLABORATION_HEARTBEAT_INTERVAL;
const heartbeatTimer = ref(null as null | NodeJS.Timeout);

const activeUsers = computed(() => {
	return {
		default: (collaborationStore.getUsersForCurrentWorkflow || []).map((userInfo) => userInfo.user),
	};
});

const currentUserEmail = computed(() => {
	return usersStore.currentUser?.email;
});

const startHeartbeat = () => {
	if (heartbeatTimer.value !== null) {
		clearInterval(heartbeatTimer.value);
	}
	heartbeatTimer.value = setInterval(() => {
		collaborationStore.notifyWorkflowOpened(workflowsStore.workflow.id);
	}, heartbeatInterval);
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
	startHeartbeat();
	document.addEventListener('visibilitychange', onDocumentVisibilityChange);
});

onBeforeUnmount(() => {
	document.removeEventListener('visibilitychange', onDocumentVisibilityChange);
});
</script>

<template>
	<div :class="`collaboration-pane-container ${$style.container}`">
		<n8n-user-stack :users="activeUsers" :currentUserEmail="currentUserEmail" />
	</div>
</template>

<style lang="scss" module>
.container {
	margin: 0 var(--spacing-4xs);
}
</style>
