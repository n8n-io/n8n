<script setup lang="ts">
// SPIKE (agent-chat-embed): "Share outside n8n" section of a channel modal.
// `chat` sits in the API channel (v1, webhook path); `n8n-chat` in the n8n Chat
// channel (option B, n8n Chat's backend as an external principal).
// Copy is hard-coded, not i18n.
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nCopyInput,
	N8nInput,
	N8nLink,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSwitch2,
	N8nTableBase,
	N8nText,
} from '@n8n/design-system';
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
const ids = computed(() => `agent-share-${props.surface}`);

// Shaped like the channel setting on the server (ChatSurfaceSettingsSchema). Everything off by default.
type Method = 'n8nUsers' | 'magicLinks' | 'anonymous';
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
		hint: 'A personal link for each person. No n8n account needed.',
	},
	{
		key: 'anonymous',
		label: 'Anonymous',
		hint: 'Anyone with the link, without sign-in. People who sign in or use an invite still chat under their name.',
	},
];
// Option B only. Only for n8n users and invitees, never for anonymous visitors.
const FEATURES: Array<{ key: Feature; label: string; hint: string }> = [
	{
		key: 'uploads',
		label: 'File uploads',
		hint: 'Shows the 📎 button. One file per message, up to 2 MB: images, PDF, text or CSV.',
	},
];
const FEATURES_LATER = [
	{ label: 'Background jobs', hint: 'Work that finishes after the reply.' },
	{ label: 'Show plans', hint: 'The agent’s plan and progress in the chat.' },
];
const variantHint = computed(() =>
	isOptionB.value
		? 'Runs on n8n Chat: conversations stay after a reload, messages queue while the agent answers, and people can stop an answer.'
		: 'Runs on this API channel: one request per turn. A reload starts over. For history, queueing, Stop and uploads, use the n8n Chat channel.',
);

const chatUrl = ref('');
const surface = ref<Surface>({
	enabled: false,
	methods: { n8nUsers: false, magicLinks: false, anonymous: false },
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

// Invite links. The server returns a new link once (it stores only the hash) and writes it to its log.
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
const newLink = ref<{ label: string; link: string }>();
async function loadInvites() {
	invites.value = await makeRestApiRequest<Invite[]>(
		rootStore.restApiContext,
		'GET',
		`${path.value}/invites`,
	);
}
async function createInvite(body: { label: string } | { replaces: string }) {
	const created = await makeRestApiRequest<Invite & { link: string }>(
		rootStore.restApiContext,
		'POST',
		`${path.value}/invites`,
		body,
	);
	newLink.value = { label: created.label, link: created.link };
	await loadInvites();
}
async function addRecipient() {
	const label = recipient.value.trim();
	if (!label) return;
	await createInvite({ label });
	recipient.value = '';
}
async function revokeInvite(id: string) {
	await makeRestApiRequest(rootStore.restApiContext, 'DELETE', `${path.value}/invites/${id}`);
	await loadInvites();
}
function inviteStatus(invite: Invite) {
	if (invite.revokedAt) return 'Revoked';
	if (Date.parse(invite.expiresAt) <= Date.now()) return 'Expired';
	return `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`;
}

// One tag: the bundle is served by this instance and mounts itself from its data attributes.
const scriptUrl = computed(() =>
	chatUrl.value.replace(/\/[^/]+\/(chat|n8n-chat)$/, '/assets/agent-chat.js'),
);
const snippet = computed(
	() => `<script src="${scriptUrl.value}" data-agent-url="${chatUrl.value}" defer></${'script'}>`,
);
</script>

<template>
	<div v-if="chatUrl" :class="$style.share" data-testid="n8n-chat-share">
		<section :class="$style.section" :aria-labelledby="`${ids}-heading`">
			<div :class="$style.heading">
				<N8nText :id="`${ids}-heading`" tag="h3" size="medium" bold>Share outside n8n</N8nText>
				<N8nBadge>Spike</N8nBadge>
			</div>
			<N8nSettingsRowGroup :class="$style.group">
				<N8nSettingsRow
					title="Chat page and embed"
					:description="`Hosted chat page and embed for people outside the editor. ${variantHint}`"
					:max-description-lines="3"
					data-testid="n8n-chat-variant"
				>
					<template #action>
						<N8nSwitch2
							:model-value="surface.enabled"
							aria-label="Share outside n8n"
							data-testid="n8n-chat-share-toggle"
							@update:model-value="(on) => save({ enabled: !!on })"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</section>

		<template v-if="surface.enabled">
			<section :class="$style.section" :aria-labelledby="`${ids}-access`">
				<N8nText :id="`${ids}-access`" tag="h3" size="medium" bold>Who can chat</N8nText>
				<N8nSettingsRowGroup :class="$style.group" data-testid="n8n-chat-methods">
					<N8nSettingsRow
						v-for="method in METHODS"
						:key="method.key"
						:title="method.label"
						:description="method.hint"
						:model-value="method.key === 'magicLinks' && surface.methods.magicLinks"
						:expandable="method.key === 'magicLinks'"
						:disclosure="false"
					>
						<template #action>
							<N8nCheckbox
								:model-value="surface.methods[method.key]"
								:aria-label="method.label"
								:data-testid="`n8n-chat-method-${method.key}`"
								@update:model-value="(on) => setMethod(method.key, !!on)"
							/>
						</template>
						<template v-if="method.key === 'magicLinks'" #expanded>
							<div :class="$style.invites" data-testid="n8n-chat-invites-panel">
								<N8nText size="small" color="text-light">
									Valid for 7 days or until you revoke it. Links open on the chat page, not in the
									embed. No email is sent: copy the link and send it yourself.
								</N8nText>
								<div :class="$style.inline">
									<N8nInput
										v-model="recipient"
										size="small"
										placeholder="Name or email"
										aria-label="Recipient"
										data-testid="n8n-chat-invite-recipient"
										@keydown.enter.prevent="addRecipient"
									/>
									<N8nButton
										size="small"
										variant="outline"
										:disabled="!recipient.trim()"
										data-testid="n8n-chat-invite-create"
										@click="addRecipient"
										>Create link</N8nButton
									>
								</div>
								<N8nCallout v-if="newLink" theme="success" data-testid="n8n-chat-invite-new">
									<div :class="$style.newLink">
										<N8nText size="small"
											>Link for <strong>{{ newLink.label }}</strong
											>. Copy it now: it is not shown again.</N8nText
										>
										<N8nCopyInput
											:value="newLink.link"
											label="Invite link"
											size="small"
											:class="$style.code"
											data-testid="n8n-chat-invite-link"
										/>
									</div>
								</N8nCallout>
								<N8nTableBase v-if="invites.length" data-testid="n8n-chat-invites">
									<thead>
										<tr>
											<th>Recipient</th>
											<th>Status</th>
											<th>Uses</th>
											<th />
										</tr>
									</thead>
									<tbody>
										<tr v-for="invite in invites" :key="invite.id">
											<td>{{ invite.label }}</td>
											<td>{{ inviteStatus(invite) }}</td>
											<td>{{ invite.uses }}</td>
											<td>
												<div :class="$style.actions">
													<N8nLink
														size="small"
														data-testid="n8n-chat-invite-renew"
														@click="createInvite({ replaces: invite.id })"
														>New link</N8nLink
													>
													<N8nLink
														v-if="!invite.revokedAt"
														size="small"
														theme="danger"
														data-testid="n8n-chat-invite-revoke"
														@click="revokeInvite(invite.id)"
														>Revoke</N8nLink
													>
												</div>
											</td>
										</tr>
									</tbody>
								</N8nTableBase>
							</div>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						title="Email code, passcode, signed visitor token"
						description="More ways in."
					>
						<template #action><N8nBadge>Coming later</N8nBadge></template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
				<N8nCallout v-if="noMethod" theme="warning" data-testid="n8n-chat-share-empty">
					Choose at least one way in. Until then nobody can chat.
				</N8nCallout>
				<N8nText size="small" color="text-light">
					Each person sees only their own conversations. Turning a method off ends its chat sessions
					at once.
				</N8nText>
			</section>

			<section v-if="isOptionB" :class="$style.section" :aria-labelledby="`${ids}-features`">
				<N8nText :id="`${ids}-features`" tag="h3" size="medium" bold
					>What signed-in people and invitees can do</N8nText
				>
				<N8nSettingsRowGroup :class="$style.group" data-testid="n8n-chat-features">
					<N8nSettingsRow
						v-for="feature in FEATURES"
						:key="feature.key"
						:title="feature.label"
						:description="feature.hint"
					>
						<template #action>
							<N8nCheckbox
								:model-value="!!surface.features?.[feature.key]"
								:aria-label="feature.label"
								:data-testid="`n8n-chat-feature-${feature.key}`"
								@update:model-value="(on) => setFeature(feature.key, !!on)"
							/>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						v-for="feature in FEATURES_LATER"
						:key="feature.label"
						:title="feature.label"
						:description="feature.hint"
					>
						<template #action><N8nBadge>Coming later</N8nBadge></template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
				<N8nText size="small" color="text-light">Never for anonymous visitors.</N8nText>
			</section>

			<section :class="$style.section" :aria-labelledby="`${ids}-link`">
				<N8nText :id="`${ids}-link`" tag="h3" size="medium" bold>Link and embed</N8nText>
				<N8nCallout v-if="!isPublished" theme="warning">
					Publish the agent to turn the chat page on.
				</N8nCallout>
				<div :class="$style.field">
					<label :for="`${ids}-url`">
						<N8nText size="small" bold>Chat page</N8nText>
					</label>
					<N8nCopyInput
						:id="`${ids}-url`"
						:value="chatUrl"
						label="Chat page"
						size="medium"
						data-testid="n8n-chat-url"
					/>
					<N8nText size="small" color="text-light">
						Share this link, or <N8nLink :to="chatUrl" new-window size="small">open it</N8nLink>.
					</N8nText>
				</div>
				<div :class="$style.field">
					<label :for="`${ids}-snippet`">
						<N8nText size="small" bold>Embed snippet</N8nText>
					</label>
					<N8nCopyInput
						:id="`${ids}-snippet`"
						:value="snippet"
						label="Embed snippet"
						size="medium"
						:class="$style.code"
						data-testid="n8n-chat-embed-snippet"
					/>
					<N8nText size="small" color="text-light">
						Paste into any website’s HTML. n8n users sign in through a popup on this instance.
					</N8nText>
				</div>
			</section>
		</template>
	</div>
</template>

<style module lang="scss">
.share {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

// Same as the Slack channel's settings groups.
.group.group {
	background: transparent;
	overflow: visible;
}

// The expanded region is flush with the group's edges; keep the rows' side padding.
.invites {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.inline {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.newLink {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.code input {
	font-family: monospace;
	text-overflow: ellipsis;
}
</style>
