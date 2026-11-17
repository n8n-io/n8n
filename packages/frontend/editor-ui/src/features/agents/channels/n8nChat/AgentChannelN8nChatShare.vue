<script setup lang="ts">
// SPIKE (agent-chat-embed): chat page link + embed snippet of the n8n Chat channel.
// Copy is hard-coded, not i18n.
import {
	N8nButton,
	N8nCopyInput,
	N8nInput,
	N8nLink,
	N8nSegmentControl,
	N8nText,
} from '@n8n/design-system';
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
	await loadInvites();
});
async function setAccess(value: 'users' | 'public') {
	access.value = value;
	await makeRestApiRequest(rootStore.restApiContext, 'PUT', path.value, { access: value });
}

// Magic links per recipient. The server writes the link to its log (spike: no email).
interface Invite {
	id: string;
	label: string;
	expiresAt: string;
	revokedAt?: string;
	uses: number;
	lastUsedAt?: string;
}
const invites = ref<Invite[]>([]);
const recipient = ref('');
async function loadInvites() {
	invites.value = await makeRestApiRequest<Invite[]>(
		rootStore.restApiContext,
		'GET',
		`${path.value}/invites`,
	);
}
async function createInvite() {
	if (!recipient.value.trim()) return;
	await makeRestApiRequest(rootStore.restApiContext, 'POST', `${path.value}/invites`, {
		label: recipient.value.trim(),
	});
	recipient.value = '';
	await loadInvites();
}
async function revokeInvite(id: string) {
	await makeRestApiRequest(rootStore.restApiContext, 'DELETE', `${path.value}/invites/${id}`);
	await loadInvites();
}
function inviteStatus(invite: Invite) {
	if (invite.revokedAt) return 'revoked';
	if (Date.parse(invite.expiresAt) <= Date.now()) return 'expired';
	return `expires ${new Date(invite.expiresAt).toLocaleDateString()}, used ${invite.uses}×`;
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
		<N8nText size="small" bold>Invite people (spike)</N8nText>
		<N8nText size="small" color="text-light">
			A personal link for one person: they chat without an n8n account and see only their own
			conversations. Valid 7 days, until you revoke it. Spike: no email is sent, the link is written
			to the n8n server log. Links work on the chat page, not in the embed.
		</N8nText>
		<div :class="$style.inviteRow">
			<N8nInput
				v-model="recipient"
				size="small"
				placeholder="Name or email"
				data-testid="n8n-chat-invite-recipient"
				@keydown.enter.prevent="createInvite"
			/>
			<N8nButton
				size="small"
				variant="outline"
				:disabled="!recipient.trim()"
				data-testid="n8n-chat-invite-create"
				@click="createInvite"
				>Create link</N8nButton
			>
		</div>
		<ul :class="$style.invites" data-testid="n8n-chat-invites">
			<li v-for="invite in invites" :key="invite.id" :class="$style.inviteRow">
				<N8nText size="small" bold>{{ invite.label }}</N8nText>
				<N8nText size="small" color="text-light">{{ inviteStatus(invite) }}</N8nText>
				<N8nLink
					v-if="!invite.revokedAt"
					size="small"
					data-testid="n8n-chat-invite-revoke"
					@click="revokeInvite(invite.id)"
					>Revoke</N8nLink
				>
			</li>
		</ul>
	</div>
</template>

<style module lang="scss">
.share {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.inviteRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.invites {
	list-style: none;
	padding: 0;
	margin: 0;
}
</style>
