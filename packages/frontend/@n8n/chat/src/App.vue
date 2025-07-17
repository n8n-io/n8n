<script lang="ts" setup>
import { computed } from 'vue';

import Chat from '@n8n/chat/components/Chat.vue';
import ChatWindow from '@n8n/chat/components/ChatWindow.vue';
import { useOptions } from '@n8n/chat/composables';

defineProps({});

const { options } = useOptions();

const isFullscreen = computed<boolean>(() => options.mode === 'fullscreen');
</script>
<template>
	<Chat v-if="isFullscreen" class="n8n-chat" />
	<ChatWindow v-else class="n8n-chat" />
</template>
