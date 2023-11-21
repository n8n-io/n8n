<script setup lang="ts">
import { useCollaborationStore, useUsersStore, useWorkflowsStore } from '@/stores';
import { onBeforeUnmount } from 'vue';
import { onMounted } from 'vue';
import { computed, ref } from 'vue';

const collaborationStore = useCollaborationStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();

const heartbeatInterval = 300000;
const heartbeatTimer = ref(null as null | NodeJS.Timeout);

onMounted(() => {
	heartbeatTimer.value = setInterval(() => {
		collaborationStore.notifyWorkflowOpened(workflowsStore.workflow.id);
	}, heartbeatInterval);
});

onBeforeUnmount(() => {
	if (heartbeatTimer.value !== null) {
		clearInterval(heartbeatTimer.value);
	}
});

const activeUsers = computed(() => {
	return {
		default: (collaborationStore.getUsersForCurrentWorkflow || []).map((userInfo) => userInfo.user),
	};
});

const currentUserEmail = computed(() => {
	return usersStore.currentUser?.email;
});
</script>

<template>
	<div :class="`collaboration-pane-container ${$style.container}`">
		<n8n-user-stack
			v-if="activeUsers.default.length > 1"
			:users="activeUsers"
			:currentUserEmail="currentUserEmail"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	margin: 0 var(--spacing-4xs);
}
</style>
