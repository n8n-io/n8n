<script setup lang="ts">
// SPIKE (agent-chat-embed): chat page link + embed snippet of the n8n Chat channel.
// Copy is hard-coded, not i18n.
import { N8nCopyInput, N8nInput, N8nLink, N8nSegmentControl, N8nText } from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{ projectId: string; agentId: string; isPublished: boolean }>();
const rootStore = useRootStore();
const path = computed(() => `/projects/${props.projectId}/agents/v2/${props.agentId}/chat-page`);

const chatUrl = ref('');
const access = ref<'users' | 'public'>('users');
onMounted(async () => {
	const page = await makeRestApiRequest<{ url: string; access: 'users' | 'public' }>(
		rootStore.restApiContext,
		'GET',
		path.value,
	);
	chatUrl.value = page.url;
	access.value = page.access;
});
async function setAccess(value: 'users' | 'public') {
	access.value = value;
	await makeRestApiRequest(rootStore.restApiContext, 'PUT', path.value, { access: value });
}

// One tag: the bundle is served by this instance and mounts itself from its data attributes.
const scriptUrl = computed(() => chatUrl.value.replace(/\/[^/]+\/chat$/, '/assets/agent-chat.js'));
const snippet = computed(
	() => `<script src="${scriptUrl.value}" data-agent-url="${chatUrl.value}" defer></${'script'}>`,
);
const { copy, copied } = useClipboard();
</script>

<template>
	<div v-if="chatUrl" :class="$style.share" data-testid="n8n-chat-share">
		<N8nText size="small" bold>Chat page &amp; embed (spike)</N8nText>
		<N8nSegmentControl
			:model-value="access"
			:options="[
				{ label: 'n8n users', value: 'users' },
				{ label: 'Public', value: 'public' },
			]"
			data-testid="n8n-chat-share-access"
			@update:model-value="(value) => setAccess(value as 'users' | 'public')"
		/>
		<N8nText size="small" color="text-light">
			{{
				access === 'users'
					? 'Anyone who can sign in to this n8n instance can chat, also chat-only users. Each person sees only their own conversations.'
					: 'Anyone with the link can chat. No sign-in.'
			}}
			<template v-if="!isPublished"> Publish the agent to turn the page on.</template>
			<N8nLink v-else :to="chatUrl" new-window size="small">Open</N8nLink>
		</N8nText>
		<N8nCopyInput :value="chatUrl" size="medium" data-testid="n8n-chat-url" />
		<N8nText size="small" color="text-light">
			Embed on any website: paste into the page HTML. With “n8n users”, the widget signs in through
			a popup on this instance.
			<N8nLink size="small" @click="copy(snippet)">{{
				copied ? 'Copied' : 'Copy snippet'
			}}</N8nLink>
		</N8nText>
		<N8nInput
			:model-value="snippet"
			type="textarea"
			:rows="3"
			readonly
			data-testid="n8n-chat-embed-snippet"
		/>
	</div>
</template>

<style module lang="scss">
.share {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}
</style>
