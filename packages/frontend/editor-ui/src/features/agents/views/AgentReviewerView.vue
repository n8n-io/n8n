<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useAgentEvalsStore } from '../agentEvals.store';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { getAgent } from '../composables/useAgentApi';
import { useWireframeReviewers } from '../composables/useWireframeReviewers';
import type { AgentResource } from '../types';
import { isDataTableDataset, toCaseSource } from '../utils/agentEvalCases.utils';
import AgentChatPanel from '../components/AgentChatPanel.vue';

// Wireframe: the page an invited reviewer lands on. A stripped chat plus one
// verdict row per reply. "Not right" + a sentence becomes a check with their name.
// The token is plain `project~agent~reviewer`; a real link would be signed.
const i18n = useI18n();
const route = useRoute();
const rootStore = useRootStore();
const evalsStore = useAgentEvalsStore();

const token = computed(() => String(route.params.token ?? ''));
const [projectId, agentId, reviewerId] = token.value.split('~');
const reviewers = useWireframeReviewers(ref(agentId ?? ''));
const reviewer = computed(() => reviewers.people.value.find((r) => r.id === reviewerId) ?? null);

const agent = ref<AgentResource | null>(null);
const failed = ref(false);
onMounted(async () => {
	if (!projectId || !agentId || !reviewerId) {
		failed.value = true;
		return;
	}
	try {
		agent.value = await getAgent(rootStore.restApiContext, projectId, agentId);
	} catch {
		failed.value = true;
	}
});

const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');
const messages = computed(() => chatPanel.value?.messages ?? []);
const lastAssistant = computed(
	() => [...messages.value].reverse().find((m) => m.role === 'assistant') ?? null,
);
const lastUser = computed(
	() => [...messages.value].reverse().find((m) => m.role === 'user') ?? null,
);

// One verdict per reply. Resets when a new reply arrives.
const judgedId = ref<string | null>(null);
const noting = ref(false);
const note = ref('');
const thanks = ref(false);
watch(lastAssistant, () => {
	noting.value = false;
	note.value = '';
	thanks.value = false;
});
const canJudge = computed(
	() => lastAssistant.value !== null && judgedId.value !== lastAssistant.value.id,
);

function bumpAttention() {
	if (!reviewer.value) return;
	reviewers.reviewers.value = reviewers.reviewers.value.map((r) =>
		r.id === reviewer.value?.id ? { ...r, attention: r.attention + 1 } : r,
	);
}

function looksRight() {
	judgedId.value = lastAssistant.value?.id ?? null;
	thanks.value = true;
}

async function notRight() {
	const sentence = note.value.trim();
	judgedId.value = lastAssistant.value?.id ?? null;
	noting.value = false;
	thanks.value = true;
	bumpAttention();
	if (!sentence || !projectId || !agentId) return;
	try {
		if (!evalsStore.isLoaded(agentId)) await evalsStore.fetchDatasets(projectId, agentId);
		const dataset = evalsStore.getDatasets(agentId).find(isDataTableDataset);
		const source = dataset ? toCaseSource(dataset) : null;
		if (!source) return;
		await evalsStore.createCase(projectId, source, {
			input: lastUser.value?.content ?? '',
			whatToCheck: `${sentence} — ${reviewer.value?.name ?? ''}`.trim(),
		});
	} catch {
		// Wireframe: a failed write only means the check isn't recorded.
	}
}
</script>

<template>
	<main :class="$style.page" data-testid="agent-reviewer-page">
		<div v-if="failed || (!reviewer && agent)" :class="$style.invalid">
			{{ i18n.baseText('agents.review.invalid') }}
		</div>
		<template v-else-if="agent && reviewer && projectId && agentId">
			<header :class="$style.header">
				<span :class="$style.title">{{
					i18n.baseText('agents.review.title', { interpolate: { agent: agent.name } })
				}}</span>
				<span :class="$style.as">{{
					i18n.baseText('agents.review.as', { interpolate: { name: reviewer.name } })
				}}</span>
				<p :class="$style.intro">{{ i18n.baseText('agents.review.intro') }}</p>
			</header>
			<div :class="$style.chat">
				<AgentChatPanel
					ref="chatPanel"
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:agent-config="null"
					:agent-status="deriveAgentStatus(agent)"
					:connected-triggers="[]"
					:can-edit-agent="false"
				>
					<template #above-input>
						<div
							v-if="canJudge && !noting"
							:class="$style.verdictRow"
							data-testid="agent-reviewer-verdict"
						>
							<span :class="$style.grow" />
							<button
								type="button"
								:class="$style.button"
								data-testid="agent-reviewer-right"
								@click="looksRight"
							>
								{{ i18n.baseText('agents.builder.checks.state.ok') }}
							</button>
							<button
								type="button"
								:class="$style.button"
								data-testid="agent-reviewer-wrong"
								@click="noting = true"
							>
								{{ i18n.baseText('agents.builder.checks.state.flagged') }}
							</button>
						</div>
						<div v-else-if="noting" :class="$style.noteBlock" data-testid="agent-reviewer-note">
							<textarea
								v-model="note"
								:class="$style.textarea"
								rows="2"
								:placeholder="i18n.baseText('agents.review.notePlaceholder')"
							/>
							<div :class="$style.verdictRow">
								<span :class="$style.grow" />
								<button type="button" :class="$style.textButton" @click="noting = false">
									{{ i18n.baseText('agents.builder.checks.invite.cancel') }}
								</button>
								<button
									type="button"
									:class="[$style.button, $style.primary]"
									data-testid="agent-reviewer-send"
									@click="notRight"
								>
									{{ i18n.baseText('agents.review.send') }}
								</button>
							</div>
						</div>
						<div v-else-if="thanks" :class="$style.thanks" data-testid="agent-reviewer-thanks">
							<N8nIcon icon="check" :size="14" />
							{{ i18n.baseText('agents.review.thanks') }}
						</div>
					</template>
				</AgentChatPanel>
			</div>
		</template>
	</main>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: var(--wireframe--stripe-base);
	background-image: var(--wireframe--stripes);
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	color: var(--text-color);
}

.header {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--2xs) var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--lg);
	border-bottom: var(--wireframe--border);
	background: var(--background--surface);
}

.title {
	font-size: var(--font-size--lg);
	font-weight: var(--wireframe--font-weight);
}

.as {
	color: var(--text-color--subtler);
}

.intro {
	flex-basis: 100%;
	margin: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
}

.chat {
	flex: 1;
	min-height: 0;
	display: flex;
	width: min(48rem, 100%);
	margin: 0 auto;
}

.invalid {
	margin: auto;
	padding: var(--spacing--lg);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	font-weight: var(--wireframe--font-weight);
}

.verdictRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--2xs);
	font-size: var(--font-size--sm);
}

.grow {
	flex: 1;
}

.button,
.textButton {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	white-space: nowrap;
	cursor: pointer;
}

.textButton {
	border-color: transparent;
	color: var(--text-color--subtler);
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);
}

.noteBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--2xs);
}

.textarea {
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

.thanks {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	margin-bottom: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--wireframe--border-width) dashed var(--color--success);
	border-radius: var(--wireframe--radius);
	color: var(--color--success);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--sm);
}
</style>
