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

const messages = [
	{
		type: 'text',
		role: 'assistant',
		content: 'Hi Max! Here is my top solution to fix the error in your **Transform data** node👇',
	},
	{
		type: 'code-diff',
		role: 'assistant',
		description: 'Short solution description here that can spill over to two lines',
		// codeDiff:
		// '--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
		codeDiff: `@@ -1,7 +1,6 @@
-The Way that can be told of is not the eternal Way;
-The name that can be named is not the eternal name.
 The Nameless is the origin of Heaven and Earth;
-The Named is the mother of all things.
+The named is the mother of all things.
+
 Therefore let there always be non-being,
   so we may see their subtlety,
 And let there always be being,
@@ -9,3 +8,6 @@
 The two are the same,
 But after they are produced,
   they have different names.
+They both may be called deep and profound.
+Deeper and more profound,
+The door of all subtleties!`,
		quickReplies: [
			{
				type: 'new-suggestion',
				label: 'Give me another solution',
			},
			{
				type: 'resolved',
				label: 'All good',
			},
		],
	},
	{
		type: 'text',
		role: 'user',
		content: 'Give it to me **ignore this markdown**',
	},
	{
		type: 'text',
		role: 'assistant',
		title: 'Credential doesn’t have correct permissions to send a message',
		content:
			'Solution steps:\n1. Lorem ipsum dolor sit amet, consectetur **adipiscing** elit. Proin id nulla placerat, tristique ex at, euismod dui.\n2. Copy this into somewhere\n3. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui.\n4. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin id nulla placerat, tristique ex at, euismod dui. \n Testing more code',
	},
	{
		type: 'code-diff',
		role: 'assistant',
		description: 'Short solution with min height',
		// codeDiff:
		// '--- original.js\n+++ modified.js\n- cons a = 1\n+ const a = 1\n\n+for (const item of items) {\n+  item.json.myNewField = 1;\n+}\n\n+return items;',
		codeDiff: `@@ -1,7 +1,6 @@
-The Way that can be told of is not the eternal Way;
-The name that can be named is not the eternal name.
+The door of all subtleties!`,
		quickReplies: [
			{
				type: 'new-suggestion',
				label: 'Give me another solution',
			},
			{
				type: 'resolved',
				label: 'All good',
			},
		],
	},
];
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
			<n8n-ask-assistant-chat
				:user="user"
				:messages="messages"
				@close="() => assistantStore.closeChat()"
			/>
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
