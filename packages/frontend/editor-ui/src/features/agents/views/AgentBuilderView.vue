<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getAgent, updateAgent } from '../composables/useAgentApi';
import type { AgentResource } from '../types';
import { useAgentSchema } from '../composables/useAgentSchema';
import type { AgentSchema } from '../types';
import { deepCopy } from 'n8n-workflow';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentHomeContent from '../components/AgentHomeContent.vue';
import AgentSettingsSidebar from '../components/AgentSettingsSidebar.vue';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = route.params.agentId as string;

// UI state
const chatActive = ref(false);
const settingsVisible = ref(true);
const code = ref('');
const agentName = ref('');
const agentDescription = ref<string | null>(null);
const agent = ref<AgentResource | null>(null);
const updatedAt = ref<string>('');
let skipNextWatch = false;

// Auto-trigger from creation flow prompt
const initialPrompt = ref<string | undefined>(undefined);

// Schema
const { schema, fetchSchema, updateSchema } = useAgentSchema();
const localSchema = ref<AgentSchema | null>(null);

// Dirty state (shared between view and sidebar)
const originalSchemaJson = ref('');
const isDirty = ref(false);

watch(
	schema,
	(s) => {
		if (s) {
			localSchema.value = deepCopy(s);
			originalSchemaJson.value = JSON.stringify(s);
			isDirty.value = false;
		}
	},
	{ immediate: true },
);

async function fetchAgent() {
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId);
	agent.value = data;
	updatedAt.value = data.updatedAt;
	skipNextWatch = true;
	code.value = data.code;
	agentName.value = data.name;
	agentDescription.value = data.description ?? null;
}

const autoSave = useDebounceFn(async () => {
	if (!agent.value) return;
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId, {
		code: code.value,
	});
	if (updated) {
		updatedAt.value = updated.updatedAt;
		await fetchSchema(projectId.value, agentId);
	}
}, 1000);

watch(code, () => {
	if (skipNextWatch) {
		skipNextWatch = false;
		return;
	}
	void autoSave();
});

// Builder code streaming
let codeStreamBuffer = '';
let isCodeStreaming = false;

function onCodeDelta(delta: string) {
	if (!isCodeStreaming) {
		isCodeStreaming = true;
		codeStreamBuffer = '';
	}
	codeStreamBuffer += delta;

	const match = codeStreamBuffer.match(/"code"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/s);
	if (match) {
		try {
			const parsed = JSON.parse(`"${match[1]}"`);
			code.value = parsed;
		} catch {
			code.value = match[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
		}
	}
}

function onCodeUpdated() {
	isCodeStreaming = false;
	codeStreamBuffer = '';
	void fetchAgent();
}

async function updateName(name: string) {
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId, {
		name,
	});
	if (updated) {
		agent.value = updated;
		agentName.value = updated.name;
	}
}

async function updateDescription(description: string) {
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId, {
		description,
	} as Record<string, unknown>);
	if (updated) {
		agent.value = updated;
		agentDescription.value = updated.description ?? null;
	}
}

function startChat(message: string) {
	initialPrompt.value = message;
	chatActive.value = true;
}

function onSchemaFieldUpdate(updates: Partial<AgentSchema>) {
	if (!localSchema.value) return;
	Object.assign(localSchema.value, updates);
	if (updates.config) {
		localSchema.value.config = { ...localSchema.value.config, ...updates.config };
	}
	isDirty.value = JSON.stringify(localSchema.value) !== originalSchemaJson.value;
}

async function saveSchema() {
	if (!localSchema.value) return;
	const result = await updateSchema(projectId.value, agentId, localSchema.value, updatedAt.value);
	if (result) {
		skipNextWatch = true;
		code.value = result.code;
		updatedAt.value = result.updatedAt;
		originalSchemaJson.value = JSON.stringify(localSchema.value);
		isDirty.value = false;
	}
}

function cancelSchema() {
	if (schema.value) {
		localSchema.value = deepCopy(schema.value);
		isDirty.value = false;
	}
}

function onCodeUpdate(newCode: string) {
	code.value = newCode;
}

onMounted(async () => {
	await fetchAgent();
	await fetchSchema(projectId.value, agentId);

	// Auto-trigger chat from creation flow
	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}
});
</script>

<template>
	<div :class="$style.builder">
		<!-- Unified top bar spanning full width -->
		<div :class="$style.topBar">
			<!-- Left: agent breadcrumb (for center column) -->
			<div :class="$style.topBarLeft">
				<N8nIcon icon="robot" :size="16" />
				<N8nText tag="span" bold>{{
					agentName || locale.baseText('agents.home.untitledAgent')
				}}</N8nText>
			</div>

			<!-- Center spacer -->
			<div :class="$style.topBarCenter">
				<button
					:class="[$style.toggleBtn, settingsVisible && $style.toggleBtnActive]"
					data-testid="toggle-settings"
					@click="settingsVisible = !settingsVisible"
				>
					<N8nIcon icon="sliders-horizontal" :size="16" />
				</button>
				<button
					:class="[$style.toggleBtn, !settingsVisible && $style.toggleBtnActive]"
					data-testid="toggle-activity"
				>
					<N8nIcon icon="panel-right" :size="16" />
				</button>
			</div>

			<!-- Right: settings header (Cancel + Save) — visible when sidebar is open -->
			<div v-if="settingsVisible" :class="$style.topBarRight">
				<div :class="$style.settingsHeaderDivider" />
				<N8nText tag="span" bold>{{ locale.baseText('agents.settings.title') }}</N8nText>
				<div :class="$style.settingsHeaderActions">
					<button :class="$style.cancelBtn" :disabled="!isDirty" @click="cancelSchema">
						{{ locale.baseText('agents.settings.cancel') }}
					</button>
					<N8nButton
						type="primary"
						size="small"
						:label="locale.baseText('agents.settings.save')"
						:disabled="!isDirty"
						@click="saveSchema"
					/>
				</div>
			</div>
		</div>

		<!-- Main content area -->
		<div :class="$style.content">
			<!-- Center column: home or chat -->
			<div :class="$style.center">
				<AgentHomeContent
					v-if="!chatActive"
					:agent-name="agentName"
					:agent-description="agentDescription"
					:project-id="projectId"
					:agent-id="agentId"
					@send-message="startChat"
					@update:name="updateName"
					@update:description="updateDescription"
				/>
				<AgentChatPanel
					v-else
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:initial-message="initialPrompt"
					@code-updated="onCodeUpdated"
					@code-delta="onCodeDelta"
				/>
			</div>

			<!-- Settings sidebar (no own header — header is in top bar) -->
			<AgentSettingsSidebar
				v-if="settingsVisible"
				:schema="localSchema"
				:code="code"
				:updated-at="updatedAt"
				:is-dirty="isDirty"
				@update:schema="onSchemaFieldUpdate"
				@update:code="onCodeUpdate"
			/>
		</div>
	</div>
</template>

<style module>
.builder {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.topBar {
	display: flex;
	align-items: center;
	height: 56px;
	min-height: 56px;
	padding: 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
	background-color: var(--color--background);
}

.topBarLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text);
}

.topBarCenter {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.topBarRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	margin-left: var(--spacing--sm);
}

.settingsHeaderDivider {
	width: 1px;
	height: 24px;
	background-color: var(--color--foreground);
	margin-right: var(--spacing--2xs);
}

.settingsHeaderActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.cancelBtn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding: var(--spacing--4xs) var(--spacing--xs);
	border-radius: var(--radius);
}

.cancelBtn:hover {
	background-color: var(--color--foreground--tint-2);
}

.cancelBtn:disabled {
	color: var(--color--text--tint-2);
	cursor: default;
}

.cancelBtn:disabled:hover {
	background: none;
}

.toggleBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 32px;
	height: 32px;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text--tint-2);
	border-radius: var(--radius);
	transition: background-color 0.15s ease;
}

.toggleBtn:hover {
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text);
}

.toggleBtnActive {
	color: var(--color--text);
	background-color: var(--color--foreground--tint-1);
}

.content {
	display: flex;
	flex: 1;
	min-height: 0;
	overflow: hidden;
}

.center {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
}
</style>
