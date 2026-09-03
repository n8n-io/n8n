<script setup lang="ts">
import type { CaseInputFlavor } from '@n8n/api-types';
import { N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { AgentReviewQueue } from '../composables/useAgentReviewQueue';
import { useAssistantBackgroundFix } from '../composables/useAssistantBackgroundFix';
import type { useWireframeReviewers } from '../composables/useWireframeReviewers';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';

// Wireframe: focus mode. One moment at a time, one verdict, then the next.
const props = defineProps<{
	projectId: string;
	agentId: string;
	agentName?: string;
	review: AgentReviewQueue;
	reviewers: ReturnType<typeof useWireframeReviewers>;
}>();

const emit = defineEmits<{ 'fix-with-assistant': [draft: string]; 'edit-prompt': [] }>();

const i18n = useI18n();
const router = useRouter();
const usersStore = useUsersStore();
const initials = computed(() =>
	[usersStore.currentUser?.firstName, usersStore.currentUser?.lastName]
		.map((p) => p?.trim().charAt(0) ?? '')
		.join('')
		.toUpperCase(),
);

const current = computed(() => props.review.current.value);

const FLAVOR_ICONS: Record<CaseInputFlavor, IconName> = {
	happy_path: 'circle-check',
	underspecified: 'circle-help',
	out_of_scope: 'door-open',
	adversarial: 'triangle-alert',
};

const sourceLabel = computed(() => {
	const m = current.value;
	if (!m) return '';
	if (m.kind === 'check') {
		// A typed check was drafted by the Tester; an untyped one was written by a person (avatar only).
		if (!m.flavor) return '';
		const kind = i18n.baseText(`agents.builder.preview.wireframe.evalPill.type.${m.flavor}.name`);
		return `${i18n.baseText('agents.builder.checks.evalAgent')} · ${kind}`;
	}
	return m.source;
});
const sourceIcon = computed<IconName>(() => {
	const m = current.value;
	if (!m) return 'flask-conical';
	if (m.kind === 'check') return m.flavor ? FLAVOR_ICONS[m.flavor] : 'flask-conical';
	return m.source.startsWith('Slack') ? 'message-square' : 'mail';
});

// Not right → two ways out: let the Assistant fix it here, or edit the prompt yourself.
const fixing = ref(false);
const fix = useAssistantBackgroundFix();
const rechecking = ref(false);
const fixedOnce = ref(false);
const INVITE_ID = '__invite';
const inviting = ref(false);
const inviteEmail = ref('');

watch(current, (next, previous) => {
	if (next?.key === previous?.key) return;
	fixing.value = false;
	fixedOnce.value = false;
	rechecking.value = false;
	fix.reset();
	inviting.value = false;
	inviteEmail.value = '';
});

async function notRight() {
	fixing.value = true;
	await props.review.markNotRight();
}

function buildDraft() {
	const m = current.value;
	if (!m) return '';
	const lines = [
		i18n.baseText('agents.builder.review.fixDraft.intro', {
			interpolate: { agent: props.agentName ?? '' },
		}),
		'',
		`${i18n.baseText('agents.builder.review.asked')}: ${m.request}`,
		`${i18n.baseText('agents.builder.review.replied')}: ${m.reply ?? ''}`,
	];
	if (m.whatToCheck)
		lines.push(`${i18n.baseText('agents.builder.review.whatToCheck')}: ${m.whatToCheck}`);
	return lines.join('\n');
}

// The Assistant works in the background; when it settles, the check reruns here.
async function fixWithAssistant() {
	const draft = buildDraft();
	if (!draft) return;
	await fix.start(
		{ projectId: props.projectId, agentId: props.agentId, agentName: props.agentName, draft },
		async () => {
			rechecking.value = true;
			await props.review.rerun();
			rechecking.value = false;
			fixedOnce.value = true;
			fixing.value = false;
		},
	);
}

const askItems = computed<Array<DropdownMenuItemProps<string>>>(() => [
	...props.reviewers.people.value.map((r) => ({ id: r.id, label: r.name })),
	{
		id: INVITE_ID,
		label: i18n.baseText('agents.builder.review.askInvite'),
		divided: props.reviewers.people.value.length > 0,
	},
]);

function onAsk(id: string) {
	if (id === INVITE_ID) {
		inviting.value = true;
		return;
	}
	props.review.ask(id);
}

function inviteAndAsk() {
	const r = props.reviewers.invite(inviteEmail.value, 'link');
	if (r) props.review.ask(r.id);
}

function openSession() {
	const m = current.value;
	if (!m?.threadId) return;
	void router.push({
		name: AGENT_SESSION_DETAIL_VIEW,
		params: { projectId: props.projectId, agentId: props.agentId, threadId: m.threadId },
	});
}
</script>

<template>
	<div :class="$style.stage" data-testid="agent-preview-review-stage">
		<div
			v-if="review.lastRule.value"
			:class="$style.ruleBanner"
			data-testid="agent-preview-rule-banner"
		>
			<N8nIcon icon="flask-conical" :size="14" />
			<span :class="$style.ruleText">
				{{
					i18n.baseText(
						review.lastRule.value.mode === 'updated'
							? 'agents.builder.review.checkUpdated'
							: 'agents.builder.review.ruleAdded',
					)
				}}
				<q>{{ review.lastRule.value.whatToCheck }}</q>
			</span>
			<button
				type="button"
				:class="$style.textButton"
				data-testid="agent-preview-rule-undo"
				@click="review.undoRule()"
			>
				{{ i18n.baseText('agents.builder.review.undo') }}
			</button>
		</div>

		<div
			v-if="review.done.value || !current"
			:class="$style.doneCard"
			data-testid="agent-preview-review-done"
		>
			<span :class="$style.doneTitle">{{ i18n.baseText('agents.builder.checks.caughtUp') }}</span>
			<button type="button" :class="$style.button" @click="review.close()">
				{{ i18n.baseText('agents.builder.review.backToChat') }}
			</button>
		</div>

		<article
			v-else
			:class="$style.card"
			data-testid="agent-preview-review-card"
			:data-kind="current.kind"
		>
			<header :class="$style.who">
				<span
					v-if="current.kind === 'check' && !current.flavor"
					:class="[$style.avatar, $style.person]"
					:title="i18n.baseText('wireframe.reviewers.addedByYou')"
				>
					{{ initials }}
				</span>
				<span
					v-else
					:class="[$style.avatar, current.kind === 'check' ? $style.tester : $style.channel]"
				>
					<N8nIcon :icon="sourceIcon" :size="13" />
				</span>
				<span :class="$style.source">{{ sourceLabel }}</span>
				<span :class="$style.grow" />
				<span v-if="current.sample" :class="$style.meta">{{
					i18n.baseText('agents.builder.review.sample')
				}}</span>
			</header>
			<p v-if="current.whatToCheck" :class="$style.whatToCheck">
				<span :class="$style.label">{{ i18n.baseText('agents.builder.review.whatToCheck') }}</span>
				{{ current.whatToCheck }}
			</p>

			<div :class="$style.exchange">
				<div :class="[$style.bubble, $style.request]">{{ current.request }}</div>
				<div :class="[$style.bubble, $style.reply]">
					{{ current.reply ?? i18n.baseText('agents.builder.review.noReply') }}
				</div>
			</div>

			<div v-if="inviting" :class="$style.inviteRow" data-testid="agent-preview-ask-invite">
				<input
					v-model="inviteEmail"
					:class="$style.input"
					type="email"
					:placeholder="i18n.baseText('agents.builder.checks.invite.placeholder')"
					@keydown.enter.prevent="inviteAndAsk"
				/>
				<button type="button" :class="$style.button" @click="inviteAndAsk">
					{{ i18n.baseText('agents.builder.review.askSend') }}
				</button>
			</div>

			<div v-if="fixedOnce" :class="$style.fixedLine" data-testid="agent-preview-review-fixed">
				<N8nIcon icon="check" :size="14" />
				{{ i18n.baseText('agents.builder.review.fixDone') }}
			</div>

			<footer v-if="!fixing" :class="$style.actions">
				<N8nDropdownMenu :items="askItems" placement="top-start" width="14rem" @select="onAsk">
					<template #trigger>
						<button type="button" :class="$style.button" data-testid="agent-preview-review-ask">
							{{ i18n.baseText('agents.builder.review.askSomeone') }}
						</button>
					</template>
				</N8nDropdownMenu>
				<button v-if="current.threadId" type="button" :class="$style.button" @click="openSession">
					{{ i18n.baseText('agents.builder.review.openSession') }}
				</button>
				<span :class="$style.grow" />
				<button
					type="button"
					:class="$style.textButton"
					data-testid="agent-preview-review-skip"
					@click="review.skip()"
				>
					{{ i18n.baseText('agents.builder.review.skip') }}
				</button>
				<button
					type="button"
					:class="$style.button"
					data-testid="agent-preview-review-right"
					@click="review.looksRight()"
				>
					{{ i18n.baseText('agents.builder.checks.state.ok') }}
				</button>
				<button
					type="button"
					:class="$style.button"
					data-testid="agent-preview-review-wrong"
					@click="notRight"
				>
					{{ i18n.baseText('agents.builder.checks.state.flagged') }}
				</button>
			</footer>

			<div v-else :class="$style.fixPanel" data-testid="agent-preview-review-fix-panel">
				<div :class="$style.actions">
					<button
						type="button"
						:class="[$style.button, $style.primary]"
						:disabled="
							fix.status.value === 'starting' || fix.status.value === 'working' || rechecking
						"
						data-testid="agent-preview-review-fix"
						@click="fixWithAssistant"
					>
						{{ i18n.baseText('agents.builder.review.fixWithAssistant') }}
					</button>
					<button
						type="button"
						:class="$style.button"
						data-testid="agent-preview-review-edit-prompt"
						@click="emit('edit-prompt')"
					>
						{{ i18n.baseText('agents.builder.review.editPrompt') }}
					</button>
					<span :class="$style.grow" />
					<button type="button" :class="$style.textButton" @click="review.skip()">
						{{ i18n.baseText('agents.builder.review.next') }}
					</button>
				</div>
				<div
					v-if="fix.status.value !== 'idle' || rechecking"
					:class="$style.progress"
					data-testid="agent-preview-review-progress"
				>
					<N8nIcon
						v-if="fix.status.value === 'starting' || fix.status.value === 'working' || rechecking"
						icon="loader-circle"
						:size="14"
						spin
					/>
					<N8nIcon v-else-if="fix.status.value === 'failed'" icon="triangle-alert" :size="14" />
					<span :class="$style.progressText">
						{{
							rechecking
								? i18n.baseText('agents.builder.review.rechecking')
								: fix.status.value === 'failed'
									? i18n.baseText('agents.builder.review.fixFailed')
									: fix.progress.value || i18n.baseText('agents.builder.review.fixing')
						}}
					</span>
				</div>
				<ul v-if="fix.tasks.value.length > 0" :class="$style.tasks">
					<li v-for="task in fix.tasks.value.slice(-3)" :key="task.id">{{ task.description }}</li>
				</ul>
			</div>
		</article>
	</div>
</template>

<style lang="scss" module>
.stage {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg) var(--spacing--md);
	overflow: auto;
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--sm);
	color: var(--text-color);
}

.card,
.doneCard,
.ruleBanner {
	width: min(40rem, 100%);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
}

.doneCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl) var(--spacing--md);
}

.doneTitle {
	font-size: var(--font-size--xl);
	font-weight: var(--wireframe--font-weight);
	color: var(--color--success);
}

.ruleBanner {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-style: dashed;
	border-color: var(--color--warning);
	color: var(--color--warning);
}

.ruleText {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color);
}

.who {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.avatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 50%;
	border: var(--wireframe--border);
	background: var(--background--surface);
	flex-shrink: 0;
}

.tester {
	background: color-mix(in srgb, var(--color--warning) 18%, var(--background--surface));
	color: var(--color--warning);
}

.channel {
	color: var(--wireframe--ink);
}

.person {
	background: color-mix(in srgb, var(--color--success) 20%, var(--background--surface));
	font-size: var(--font-size--2xs);
	font-weight: var(--wireframe--font-weight);
}

.source {
	font-weight: var(--wireframe--font-weight);
}

.meta {
	color: var(--text-color--subtler);
}

.whatToCheck {
	font-weight: var(--wireframe--body-weight);
	margin: 0;
	color: var(--text-color--subtler);
}

.label {
	font-weight: var(--wireframe--font-weight);
	margin-right: var(--spacing--3xs);
	color: var(--text-color);
}

.exchange {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.bubble {
	font-weight: var(--wireframe--body-weight);
	max-width: 85%;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.request {
	align-self: flex-end;
	background: var(--wireframe--hover-fill);
}

.reply {
	align-self: flex-start;
	max-height: 18rem;
	overflow: auto;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.grow {
	flex: 1;
}

.button,
.textButton {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	white-space: nowrap;
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}
}

.textButton {
	border-color: transparent;
	color: var(--text-color--subtler);
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);

	&:hover {
		background: var(--wireframe--ink);
	}
}

.fixPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.progress {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	color: var(--text-color--subtler);
	font-weight: var(--wireframe--body-weight);
}

.progressText {
	min-width: 0;
}

.tasks {
	margin: 0;
	padding-left: var(--spacing--md);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.fixedLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--success);
	font-weight: var(--wireframe--font-weight);
}

.textarea,
.input {
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	letter-spacing: inherit;
	resize: vertical;
}

.inviteRow {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
