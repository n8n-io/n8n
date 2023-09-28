<script lang="ts" setup>
import { Chat } from '@/components';
import { onMounted } from 'vue';
import hljs from 'highlight.js/lib/core';
import hljsXML from 'highlight.js/lib/languages/xml';
import hljsJavascript from 'highlight.js/lib/languages/javascript';

onMounted(() => {
	hljs.registerLanguage('xml', hljsXML);
	hljs.registerLanguage('javascript', hljsJavascript);
});
</script>
<template>
	<Chat />
</template>
