<script setup lang="ts">
// SPIKE (agent-chat-embed): chat page link + embed snippet of a channel.
// `chat` sits in the API channel (v1, webhook path); `n8n-chat` in the n8n Chat
// channel (option B, n8n Chat's backend as an external principal).
// Copy is hard-coded, not i18n.
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nCopyInput,
	N8nInput,
	N8nLink,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	isPublished: boolean;
	surface: 'chat' | 'n8n-chat';
}>();
const rootStore = useRootStore();
const isOptionB = computed(() => props.surface === 'n8n-chat');
const path = computed(
	() => `/projects/${props.projectId}/agents/v2/${props.agentId}/chat-pages/${props.surface}`,
);

// Shaped like the channel setting on the server (ChatSurfaceSettingsSchema). Everything off by default.
type Method = 'n8nUsers' | 'magicLinks' | 'public';
type Feature = 'uploads';
interface Surface {
	enabled: boolean;
	methods: Record<Method, boolean>;
	features?: Record<Feature, boolean>;
}
const METHODS: Array<{ key: Method; label: string; hint: string }> = [
	{
		key: 'n8nUsers',
		label: 'n8n users',
		hint: 'Anyone who can sign in to this instance, also chat-only users.',
	},
	{
		key: 'magicLinks',
		label: 'Invite links',
		hint: 'A personal link per person, no n8n account needed.',
	},
	{
		key: 'public',
		label: 'Public',
		hint: 'Anyone with the link, no sign-in. Signed-in people and invitees still chat under their name.',
	},
];
const LATER = ['Email code', 'Passcode', 'Signed visitor token'];
// Option B only. Only for n8n users and invitees, never for anonymous visitors.
const FEATURES: Array<{ key: Feature; label: string; hint: string }> = [
	{
		key: 'uploads',
		label: 'File uploads',
		hint: 'Shows the 📎 button in the chat. One file per message, up to 2 MB: images, PDF, text or CSV. Off: the button is greyed out.',
	},
];
const FEATURES_LATER = ['Background jobs', 'Show plans'];

const chatUrl = ref('');
const surface = ref<Surface>({
	enabled: false,
	methods: { n8nUsers: false, magicLinks: false, public: false },
});
const noMethod = computed(() => !Object.values(surface.value.methods).some(Boolean));
onMounted(async () => {
	const page = await makeRestApiRequest<Surface & { url: string }>(
		rootStore.restApiContext,
		'GET',
		path.value,
	);
	chatUrl.value = page.url;
	surface.value = { enabled: page.enabled, methods: page.methods, features: page.features };
	await loadInvites();
});
async function save(change: Partial<Surface>) {
	surface.value = { ...surface.value, ...change };
	surface.value = await makeRestApiRequest<Surface>(
		rootStore.restApiContext,
		'PUT',
		path.value,
		surface.value,
	);
}
function setMethod(key: Method, on: boolean) {
	void save({ methods: { ...surface.value.methods, [key]: on } });
}
function setFeature(key: Feature, on: boolean) {
	void save({ features: { uploads: false, ...surface.value.features, [key]: on } });
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
const scriptUrl = computed(() =>
	chatUrl.value.replace(/\/[^/]+\/(chat|n8n-chat)$/, '/assets/agent-chat.js'),
);
const snippet = computed(
	() => `<script src="${scriptUrl.value}" data-agent-url="${chatUrl.value}" defer></${'script'}>`,
);
const { copy, copied } = useClipboard();
</script>

<template>
	<div v-if="chatUrl" :class="$style.share" data-testid="n8n-chat-share">
		<N8nText size="small" color="text-light" data-testid="n8n-chat-variant">
			{{
				isOptionB
					? 'Option B: turns run on n8n Chat’s backend as an external person: conversation kept after reload, messages queue while the agent answers, Stop button, optional file uploads (below).'
					: 'v1: each turn runs on this API channel: one request per turn, a reload starts over, no queue, no Stop, no uploads. For those, use the chat page of the n8n Chat channel (option B).'
			}}
		</N8nText>
		<N8nSwitch2
			:model-value="surface.enabled"
			label="Share outside n8n (spike)"
			data-testid="n8n-chat-share-toggle"
			@update:model-value="(on) => save({ enabled: !!on })"
		/>
		<N8nText v-if="!surface.enabled" size="small" color="text-light">
			Off: no chat page and no embed for this agent.
		</N8nText>
		<template v-else>
			<N8nText size="small" bold>Who can chat</N8nText>
			<div :class="$style.methods" data-testid="n8n-chat-methods">
				<div v-for="method in METHODS" :key="method.key">
					<N8nCheckbox
						:model-value="surface.methods[method.key]"
						:label="method.label"
						:data-testid="`n8n-chat-method-${method.key}`"
						@update:model-value="(on) => setMethod(method.key, !!on)"
					/>
					<N8nText size="xsmall" color="text-light" :class="$style.hint">{{ method.hint }}</N8nText>
				</div>
				<N8nCheckbox
					v-for="label in LATER"
					:key="label"
					:model-value="false"
					:label="`${label} (coming later)`"
					disabled
				/>
			</div>
			<template v-if="isOptionB">
				<N8nText size="small" bold>What signed-in people and invitees can do</N8nText>
				<div :class="$style.methods" data-testid="n8n-chat-features">
					<div v-for="feature in FEATURES" :key="feature.key">
						<N8nCheckbox
							:model-value="!!surface.features?.[feature.key]"
							:label="feature.label"
							:data-testid="`n8n-chat-feature-${feature.key}`"
							@update:model-value="(on) => setFeature(feature.key, !!on)"
						/>
						<N8nText size="xsmall" color="text-light" :class="$style.hint">{{
							feature.hint
						}}</N8nText>
					</div>
					<N8nCheckbox
						v-for="label in FEATURES_LATER"
						:key="label"
						:model-value="false"
						:label="`${label} (coming later)`"
						disabled
					/>
					<N8nText size="xsmall" color="text-light">Never for anonymous (public) visitors.</N8nText>
				</div>
			</template>
			<N8nCallout v-if="noMethod" theme="warning" data-testid="n8n-chat-share-empty">
				Choose at least one way in. Until then nobody can chat.
			</N8nCallout>
			<N8nText size="small" color="text-light">
				Each person sees only their own conversations. Turning a method off ends its chat sessions
				at once.
				<template v-if="!isPublished"> Publish the agent to turn the page on.</template>
				<N8nLink v-else :to="chatUrl" new-window size="small">Open</N8nLink>
			</N8nText>
			<N8nCopyInput :value="chatUrl" size="medium" data-testid="n8n-chat-url" />
			<N8nText size="small" color="text-light">
				Embed on any website: paste into the page HTML. With “n8n users”, the widget signs in
				through a popup on this instance. Invite links open on the chat page, not in the embed.
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
			<template v-if="surface.methods.magicLinks">
				<N8nText size="small" bold>Invite people (spike)</N8nText>
				<N8nText size="small" color="text-light">
					A personal link for one person: they chat without an n8n account and see only their own
					conversations. Valid 7 days, until you revoke it. Spike: no email is sent, the link is
					written to the n8n server log. Links work on the chat page, not in the embed.
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
			</template>
		</template>
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

.methods {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hint {
	display: block;
	padding-left: var(--spacing--lg);
}

.invites {
	list-style: none;
	padding: 0;
	margin: 0;
}
</style>
