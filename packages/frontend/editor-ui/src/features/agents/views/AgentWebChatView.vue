<script setup lang="ts">
import { N8nButton, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import AgentChatMessageList from '../components/AgentChatMessageList.vue';
import { useAgentWebChat } from '../composables/useAgentWebChat';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();

const integrationId = String(route.params.integrationId ?? '');
const {
	config,
	messages,
	messagingState,
	isStreaming,
	error,
	authRequired,
	n8nLoginRequired,
	loadConfig,
	openSession,
	send,
	stop,
} = useAgentWebChat(integrationId);

const draft = ref('');
const user = ref('');
const password = ref('');
const signingIn = ref(false);
const ready = ref(false);

const canSubmit = computed(() => draft.value.trim().length > 0 && !isStreaming.value);
const canSignIn = computed(() => user.value.length > 0 && password.value.length > 0);
const title = computed(() => config.value?.title ?? '');

onMounted(async () => {
	await loadConfig();
	// A channel that asks for credentials waits for the form below. Any other
	// mode can open its session straight away — for `n8nUserAuth` the browser's
	// own n8n cookie is what proves who the visitor is.
	if (!error.value && !authRequired.value) {
		ready.value = await openSession();
		if (n8nLoginRequired.value) {
			await router.replace({
				name: VIEWS.SIGNIN,
				query: { redirect: encodeURIComponent(route.fullPath) },
			});
		}
	}
});

async function signIn() {
	if (!canSignIn.value) return;
	signingIn.value = true;
	try {
		ready.value = await openSession({ user: user.value, password: password.value });
	} finally {
		signingIn.value = false;
	}
}

async function onSubmit() {
	const text = draft.value.trim();
	if (!text) return;
	draft.value = '';
	await send(text);
}
</script>

<template>
	<div :class="$style.page">
		<header v-if="title" :class="$style.header">
			<N8nText tag="h1" size="medium" bold color="text-dark">{{ title }}</N8nText>
			<N8nText v-if="config?.subtitle" size="small" color="text-light">
				{{ config.subtitle }}
			</N8nText>
		</header>

		<div v-if="error && !authRequired" :class="$style.centered">
			<N8nText size="medium" color="text-base" data-test-id="agent-web-chat-error">
				{{ error }}
			</N8nText>
		</div>

		<form v-else-if="authRequired" :class="$style.centered" @submit.prevent="signIn">
			<div :class="$style.signIn">
				<N8nText size="medium" bold color="text-dark">
					{{ i18n.baseText('agents.webChat.signIn.title') }}
				</N8nText>
				<N8nInput
					v-model="user"
					:placeholder="i18n.baseText('agents.webChat.signIn.user')"
					data-test-id="agent-web-chat-user"
				/>
				<N8nInput
					v-model="password"
					type="password"
					:placeholder="i18n.baseText('agents.webChat.signIn.password')"
					data-test-id="agent-web-chat-password"
				/>
				<N8nText v-if="error" :class="$style.error" size="small">{{ error }}</N8nText>
				<N8nButton
					native-type="submit"
					:loading="signingIn"
					:disabled="!canSignIn"
					data-test-id="agent-web-chat-sign-in"
				>
					{{ i18n.baseText('agents.webChat.signIn.submit') }}
				</N8nButton>
			</div>
		</form>

		<template v-else-if="ready">
			<AgentChatMessageList :messages="messages" :messaging-state="messagingState" />
			<div :class="$style.composer">
				<ChatInputBase
					v-model="draft"
					:is-streaming="isStreaming"
					:can-submit="canSubmit"
					:placeholder="i18n.baseText('agents.webChat.placeholder')"
					@submit="onSubmit"
					@stop="stop"
				/>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
// `BaseLayout` centres this in a flex row, so without a width of its own the
// page shrinks to its content — narrow until the first reply widens it. Height
// comes from the layout's grid rather than the viewport, so the composer stays
// on screen instead of being pushed below the fold.
.page {
	display: flex;
	flex-direction: column;
	flex: 1;
	width: 100%;
	height: 100%;
	min-height: 0;
	background: var(--background--surface);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
}

.centered {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
}

.signIn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 320px;
}

.error {
	color: var(--color--danger);
}

// Mirrors `.inputArea` in AgentChatPanel, so the composer lines up with the
// transcript above it — `AgentChatMessageList` caps itself at the same width.
.composer {
	width: 100%;
	max-width: 800px;
	margin: 0 auto;
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--md);
}
</style>
