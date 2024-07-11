<script lang="ts" setup>
import { useAssistantStore } from '@/stores/assistant.store';
import { useDebounce } from '@/composables/useDebounce';
import { useUsersStore } from '@/stores/users.store';
import { computed } from 'vue';

const assistantStore = useAssistantStore();
const usersStore = useUsersStore();

const user = computed(() => ({
	firstName: usersStore.currentUser?.firstName ?? '',
	lastName: usersStore.currentUser?.lastName ?? '',
}));

const onResize = (data: { direction: string; x: number; width: number }) => {
	assistantStore.updateWindowWidth(data.width);
};

const onResizeDebounced = (data: { direction: string; x: number; width: number }) => {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
};
</script>

<template>
	<n8n-resize-wrapper
		v-if="assistantStore.chatWindowOpen"
		:supported-directions="['left']"
		:width="assistantStore.chatWidth"
		@resize="onResizeDebounced"
		:class="$style.container"
	>
		<div
			:style="{ width: `${assistantStore.chatWidth}px` }"
			:class="$style.wrapper"
			data-test-id="ask-assistant-chat"
		>
			<n8n-ask-assistant-chat :user="user" />
		</div>
	</n8n-resize-wrapper>
</template>

<style module>
.container {
	grid-area: rightsidebar;
	height: 100%;
	z-index: 3000; /* Above NDV, below notifications */
}

.wrapper {
	height: 100%;
}
</style>
