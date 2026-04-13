<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { N8nActionDropdown, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { getAgent, updateAgent, deleteAgent } from '../composables/useAgentApi';
import type { AgentResource } from '../types';
import { AGENTS_LIST_VIEW } from '../constants';
import { useAgentSchema } from '../composables/useAgentSchema';
import type { AgentSchema } from '../types';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentHomeContent from '../components/AgentHomeContent.vue';
import AgentSettingsSidebar from '../components/AgentSettingsSidebar.vue';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const message = useMessage();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
const chatActive = ref(false);
const settingsVisible = ref(true);
const code = ref('');
const agentName = ref('');
const agentDescription = ref<string | null>(null);
const agentIcon = ref<IconOrEmoji>({ type: 'icon', value: 'robot' });
const agent = ref<AgentResource | null>(null);
const updatedAt = ref<string>('');
let skipNextWatch = false;

const initialPrompt = ref<string | undefined>(undefined);

// Schema
const { schema, fetchSchema, updateSchema } = useAgentSchema();
const localSchema = ref<AgentSchema | null>(null);

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
	const data = await getAgent(rootStore.restApiContext, projectId.value, agentId.value);
	agent.value = data;
	updatedAt.value = data.updatedAt;
	skipNextWatch = true;
	code.value = data.code;
	agentName.value = data.name;
	agentDescription.value = data.description ?? null;
}

const autoSave = useDebounceFn(async () => {
	if (!agent.value) return;
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		code: code.value,
	});
	if (updated) {
		updatedAt.value = updated.updatedAt;
		await fetchSchema(projectId.value, agentId.value);
	}
}, 1000);

watch(code, () => {
	if (skipNextWatch) {
		skipNextWatch = false;
		return;
	}
	void autoSave();
});

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
			code.value = JSON.parse(`"${match[1]}"`);
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
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		name,
	});
	if (updated) {
		agent.value = updated;
		agentName.value = updated.name;
		updatedAt.value = updated.updatedAt;
	}
}

async function updateDescription(description: string) {
	const updated = await updateAgent(rootStore.restApiContext, projectId.value, agentId.value, {
		description,
	} as Record<string, unknown>);
	if (updated) {
		agent.value = updated;
		agentDescription.value = updated.description ?? null;
		updatedAt.value = updated.updatedAt;
	}
}

function startChat(msg: string) {
	initialPrompt.value = msg;
	chatActive.value = true;
	telemetry.track('User started agent chat', { agent_id: agentId.value });
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
	const result = await updateSchema(
		projectId.value,
		agentId.value,
		localSchema.value,
		updatedAt.value,
	);
	if (result) {
		skipNextWatch = true;
		code.value = result.code;
		updatedAt.value = result.updatedAt;
		originalSchemaJson.value = JSON.stringify(localSchema.value);
		isDirty.value = false;
		telemetry.track('User saved agent settings', { agent_id: agentId.value });
	}
}

function cancelSchema() {
	if (schema.value) {
		localSchema.value = deepCopy(schema.value);
		isDirty.value = false;
		telemetry.track('User cancelled agent settings', { agent_id: agentId.value });
	}
}

function onCodeUpdate(newCode: string) {
	code.value = newCode;
}

const headerActions = [{ id: 'delete', label: 'Delete agent' }];

async function onHeaderAction(action: string) {
	if (action === 'delete') {
		const confirmed = await message.confirm(
			`Are you sure you want to delete "${agentName.value}"?`,
			'Delete agent',
			{ confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' },
		);
		if (confirmed !== MODAL_CONFIRM) return;
		await deleteAgent(rootStore.restApiContext, projectId.value, agentId.value);
		void router.push({ name: AGENTS_LIST_VIEW, params: { projectId: projectId.value } });
	}
}

async function initialize() {
	// Nulling agent first ensures any in-flight autoSave bails out early
	agent.value = null;
	chatActive.value = false;
	agentIcon.value = { type: 'icon', value: 'robot' };
	initialPrompt.value = undefined;
	localSchema.value = null;
	originalSchemaJson.value = '';
	isDirty.value = false;
	isCodeStreaming = false;
	codeStreamBuffer = '';

	await fetchAgent();
	await fetchSchema(projectId.value, agentId.value);

	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}
}

watch(agentId, initialize, { immediate: true });
</script>

<template>
	<div :class="$style.builder">
		<!-- Left column: center content with its own header -->
		<div :class="$style.mainColumn">
			<div :class="$style.mainHeader">
				<div :class="$style.mainHeaderLeft">
					<N8nIcon icon="robot" :size="16" />
					<N8nText tag="span" bold>{{
						agentName || locale.baseText('agents.home.untitledAgent')
					}}</N8nText>
				</div>
				<div :class="$style.mainHeaderRight">
					<button
						v-if="chatActive"
						:class="$style.toggleBtn"
						data-testid="new-chat"
						@click="chatActive = false"
					>
						<N8nIcon icon="message-circle-plus" :size="16" />
					</button>
					<button
						:class="[$style.toggleBtn, settingsVisible && $style.toggleBtnActive]"
						data-testid="toggle-settings"
						@click="settingsVisible = !settingsVisible"
					>
						<N8nIcon icon="panel-right" :size="16" />
					</button>
					<N8nActionDropdown
						:items="headerActions"
						activator-icon="ellipsis-vertical"
						data-testid="agent-header-actions"
						@select="onHeaderAction"
					/>
				</div>
			</div>
			<div :class="$style.mainBody">
				<AgentHomeContent
					v-if="!chatActive"
					:agent-name="agentName"
					:agent-description="agentDescription"
					:agent-icon="agentIcon"
					:project-id="projectId"
					:agent-id="agentId"
					@send-message="startChat"
					@update:name="updateName"
					@update:description="updateDescription"
					@update:icon="agentIcon = $event"
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
		</div>

		<!-- Right column: settings sidebar with its own header -->
		<AgentSettingsSidebar
			v-if="settingsVisible"
			:schema="localSchema"
			:code="code"
			:updated-at="updatedAt"
			:is-dirty="isDirty"
			@update:schema="onSchemaFieldUpdate"
			@update:code="onCodeUpdate"
			@save="saveSchema"
			@cancel="cancelSchema"
		/>
	</div>
</template>

<style module>
.builder {
	display: flex;
	height: 100%;
	width: 100%;
	overflow: hidden;
}

.mainColumn {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
}

.mainHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 56px;
	min-height: 56px;
	padding: 0 var(--spacing--sm);
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground);
}

.mainHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--text);
}

.mainHeaderRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.mainBody {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
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
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
}

.toggleBtn:hover {
	background-color: var(--color--foreground--tint-2);
	color: var(--color--text);
}

.toggleBtnActive {
	color: var(--color--text);
	background-color: var(--color--foreground--tint-1);
}
</style>
