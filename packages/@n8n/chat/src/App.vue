<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import hljs from 'highlight.js/lib/core';
import hljsXML from 'highlight.js/lib/languages/xml';
import hljsJavascript from 'highlight.js/lib/languages/javascript';
import { Chat, ChatWindow } from '@n8n/chat/components';
import { useOptions } from '@n8n/chat/composables';

defineProps({});

const { options } = useOptions();

const isFullscreen = computed<boolean>(() => options.mode === 'fullscreen');

onMounted(() => {
	hljs.registerLanguage('xml', hljsXML);
	hljs.registerLanguage('javascript', hljsJavascript);
});
</script>
<template>
	<Chat v-if="isFullscreen" class="n8n-chat" />
	<ChatWindow v-else class="n8n-chat" />
</template>
