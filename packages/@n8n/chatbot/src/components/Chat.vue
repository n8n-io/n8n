<script setup lang="ts">
import { Layout, PoweredBy, MessagesList, GetStarted } from '@/components';
import { computed, onMounted, toRefs } from 'vue';
import { useI18n, useOptions } from '@/composables';
import { useChatStore } from '@/stores/chat';

const { options } = useOptions();
const { t, te } = useI18n();
const chatStore = useChatStore();

const { messages, currentSessionId } = toRefs(chatStore);

const footerVisible = computed<boolean>(() => {
	return !!options.poweredBy || te('footer') || !!currentSessionId.value;
});

async function initialize() {
	await chatStore.loadPreviousSession();
}

async function getStarted() {
	void chatStore.startNewSession();
}

onMounted(() => {
	void initialize();
});
</script>

<template>
	<Layout class="chat-wrapper">
		<template #header>
			<h1>{{ t('title') }}</h1>
			<p>{{ t('subtitle') }}</p>
		</template>
		<GetStarted v-if="!currentSessionId" @click:button="getStarted" />
		<MessagesList v-else :messages="messages" />
		<template v-if="footerVisible" #footer>
			<div v-if="te('footer')">
				{{ t('footer') }}
			</div>
			<PoweredBy v-if="options.poweredBy" />
		</template>
	</Layout>
</template>

<style lang="scss" scoped>
.chat-wrapper {
	.chat-get-started {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
	}
}
</style>
