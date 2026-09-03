<script setup lang="ts">
import { N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { listAgents } from '@/features/agents/composables/useAgentApi';
import type { useWireframeReviewers } from '@/features/agents/composables/useWireframeReviewers';
import type { AgentResource } from '@/features/agents/types';

// Wireframe stub: the "+" in a reviewers cluster. Invite a person (link or role)
// or attach one of the project's agents as a custom tester. Local state only.
const props = defineProps<{
	projectId: string | undefined;
	excludeAgentId?: string;
	reviewers: ReturnType<typeof useWireframeReviewers>;
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const open = ref(false);
const mode = ref<'person' | 'tester'>('person');
const email = ref('');
const access = ref<'link' | 'role'>('link');

const agents = ref<AgentResource[]>([]);
const loadingAgents = ref(false);
async function loadAgents() {
	if (!props.projectId || agents.value.length > 0) return;
	loadingAgents.value = true;
	try {
		agents.value = (await listAgents(rootStore.restApiContext, props.projectId)).filter(
			(a) => a.id !== props.excludeAgentId,
		);
	} catch {
		agents.value = [];
	} finally {
		loadingAgents.value = false;
	}
}
watch([open, mode], ([isOpen, m]) => {
	if (isOpen && m === 'tester') void loadAgents();
});

const attached = computed(() => new Set(props.reviewers.testers.value.map((t) => t.agentId)));

function sendInvite() {
	if (props.reviewers.invite(email.value, access.value)) {
		email.value = '';
		open.value = false;
	}
}

function addTester(agent: AgentResource) {
	props.reviewers.addTester({ id: agent.id, name: agent.name });
	open.value = false;
}
</script>

<template>
	<N8nPopover
		v-model:open="open"
		width="18rem"
		align="end"
		:collision-padding="16"
		:show-arrow="false"
	>
		<template #trigger>
			<button
				type="button"
				:class="[$style.plus, { [$style.active]: open }]"
				:aria-label="i18n.baseText('wireframe.reviewers.add')"
				data-testid="wireframe-reviewer-plus"
			>
				+
			</button>
		</template>
		<template #content>
			<div :class="$style.panel" data-testid="wireframe-reviewer-plus-panel">
				<div :class="$style.modes">
					<button
						type="button"
						:class="[$style.mode, { [$style.modeActive]: mode === 'person' }]"
						data-testid="wireframe-reviewer-mode-person"
						@click="mode = 'person'"
					>
						{{ i18n.baseText('wireframe.reviewers.person') }}
					</button>
					<button
						type="button"
						:class="[$style.mode, { [$style.modeActive]: mode === 'tester' }]"
						data-testid="wireframe-reviewer-mode-tester"
						@click="mode = 'tester'"
					>
						{{ i18n.baseText('wireframe.reviewers.tester') }}
					</button>
				</div>

				<template v-if="mode === 'person'">
					<input
						v-model="email"
						:class="$style.input"
						type="email"
						:placeholder="i18n.baseText('agents.builder.checks.invite.placeholder')"
						data-testid="wireframe-reviewer-email"
						@keydown.enter.prevent="sendInvite"
					/>
					<div :class="$style.access">
						<label :class="[$style.option, { [$style.optionActive]: access === 'link' }]">
							<input v-model="access" type="radio" value="link" />
							<span>{{ i18n.baseText('agents.builder.checks.invite.link') }}</span>
						</label>
						<label :class="[$style.option, { [$style.optionActive]: access === 'role' }]">
							<input v-model="access" type="radio" value="role" />
							<span>{{ i18n.baseText('agents.builder.checks.invite.role') }}</span>
						</label>
					</div>
					<div :class="$style.row">
						<span :class="$style.grow" />
						<button
							type="button"
							:class="[$style.button, $style.primary]"
							data-testid="wireframe-reviewer-send"
							@click="sendInvite"
						>
							{{ i18n.baseText('agents.builder.checks.invite.send') }}
						</button>
					</div>
				</template>

				<template v-else>
					<p :class="$style.hint">{{ i18n.baseText('wireframe.reviewers.tester.hint') }}</p>
					<ul :class="$style.agents">
						<li v-if="loadingAgents" :class="$style.muted">
							{{ i18n.baseText('wireframe.reviewers.tester.loading') }}
						</li>
						<li v-else-if="agents.length === 0" :class="$style.muted">
							{{ i18n.baseText('wireframe.reviewers.tester.none') }}
						</li>
						<li v-for="agent in agents" :key="agent.id">
							<button
								type="button"
								:class="$style.agent"
								:disabled="attached.has(agent.id)"
								data-testid="wireframe-reviewer-agent"
								@click="addTester(agent)"
							>
								<N8nIcon icon="bot" :size="14" />
								<span :class="$style.agentName">{{ agent.name }}</span>
								<span v-if="attached.has(agent.id)" :class="$style.muted">{{
									i18n.baseText('wireframe.reviewers.tester.added')
								}}</span>
							</button>
						</li>
					</ul>
				</template>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.plus {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.75rem;
	height: 1.75rem;
	border-radius: 50%;
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	background: var(--background--surface);
	color: var(--text-color--subtler);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--sm);
	line-height: 1;
	cursor: pointer;

	&:hover,
	&.active {
		border-color: var(--wireframe--ink);
		color: var(--wireframe--ink);
	}
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	font-family: var(--wireframe--font-family);
	letter-spacing: var(--wireframe--letter-spacing);
	font-size: var(--font-size--sm);
	color: var(--text-color);
}

.modes {
	display: flex;
	gap: var(--spacing--3xs);
}

.mode,
.option,
.button {
	flex: 1;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border-width) dashed var(--border-color--strong);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	font-weight: var(--wireframe--font-weight);
	letter-spacing: inherit;
	cursor: pointer;
	text-align: center;
}

.modeActive,
.optionActive {
	border-style: solid;
	border-color: var(--wireframe--ink);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: normal;
	text-align: left;
}

.access {
	display: flex;
	gap: var(--spacing--3xs);
}

.input {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	letter-spacing: inherit;
}

.row {
	display: flex;
	align-items: center;
}

.grow {
	flex: 1;
}

.button {
	flex: 0 0 auto;
	border-style: solid;
	border-color: var(--wireframe--ink);
}

.primary {
	background: var(--wireframe--ink);
	color: var(--background--surface);
}

.hint,
.muted {
	margin: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.agents {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	max-height: 14rem;
	overflow: auto;
}

.agent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	letter-spacing: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}

	&:disabled {
		opacity: 0.6;
		cursor: default;
	}
}

.agentName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: var(--wireframe--font-weight);
}
</style>
