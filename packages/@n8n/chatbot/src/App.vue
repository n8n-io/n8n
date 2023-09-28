<script lang="ts" setup>
import { Chat, ChatWindow } from '@/components';
import { computed, onMounted } from 'vue';
import hljs from 'highlight.js/lib/core';
import hljsXML from 'highlight.js/lib/languages/xml';
import hljsJavascript from 'highlight.js/lib/languages/javascript';
import { useOptions } from '@/composables';

const { options } = useOptions();

const isFullscreen = computed<boolean>(() => options.mode === 'fullscreen');

onMounted(() => {
	hljs.registerLanguage('xml', hljsXML);
	hljs.registerLanguage('javascript', hljsJavascript);
});
</script>
<template>
	<Chat v-if="isFullscreen" />
	<ChatWindow v-else />
</template>
