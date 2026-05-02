<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
	N8nButton,
	N8nDropdown,
	N8nIcon,
	N8nRadioButtons,
	N8nResizeWrapper,
	N8nTooltip,
	N8nCard,
	N8nHeading,
	N8nText,
} from '@n8n/design-system';
import type { N8nDropdownOption } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { AGENT_SCHEDULE_TRIGGER_TYPE } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { MODAL_CONFIRM } from '@/app/constants';
import { deepCopy } from 'n8n-workflow';
import {
	getAgent,
	deleteAgent,
	updateAgentSkill,
	createAgentSkill,
} from '../composables/useAgentApi';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import type { AgentResource, AgentJsonConfig, AgentJsonToolRef, AgentSkill } from '../types';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import { useAgentConfirmationModal } from '../composables/useAgentConfirmationModal';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useAgentBuilderStatus } from '../composables/useAgentBuilderStatus';
import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentBuilderLayout } from '../composables/useAgentBuilderLayout';
import { useAgentBuilderSession } from '../composables/useAgentBuilderSession';
import { useAgentChatMode, type ChatMode } from '../composables/useAgentChatMode';
import { useAgentConfigAutosave } from '../composables/useAgentConfigAutosave';
import {
	AGENT_BUILDER_VIEW,
	EXECUTIONS_SECTION_KEY,
	EVALS_SECTION_KEY,
	AGENT_TOOLS_MODAL_KEY,
	AGENT_TOOL_CONFIG_MODAL_KEY,
	AGENT_SKILL_MODAL_KEY,
	AGENT_ADD_TRIGGER_MODAL_KEY,
	CONTINUE_SESSION_ID_PARAM,
} from '../constants';
import { agentsEventBus } from '../agents.eventBus';
import AgentBuilderHeader from '../components/AgentBuilderHeader.vue';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentMemoryPanel from '../components/AgentMemoryPanel.vue';
import AgentSessionsListView from './AgentSessionsListView.vue';
import AgentInfoPanel from '../components/AgentInfoPanel.vue';
import AgentIdentityHeader from '../components/AgentIdentityHeader.vue';
import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import AgentChatQuickActions from '../components/AgentChatQuickActions.vue';
import AgentBuilderUnconfiguredEmptyState from '../components/AgentBuilderUnconfiguredEmptyState.vue';
import AgentCapabilitiesSection from '../components/AgentCapabilitiesSection.vue';
import AgentConfigJsonEditor from '../components/AgentConfigJsonEditor.vue';
import AgentPanelHeader from '../components/AgentPanelHeader.vue';

type AgentBuilderMainTab = 'agent' | 'executions' | 'evaluations' | 'raw';
type AgentBuilderSection = typeof EXECUTIONS_SECTION_KEY | typeof EVALS_SECTION_KEY | 'raw' | null;

const SECTION_QUERY_PARAM = 'section';

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const sessionsStore = useAgentSessionsStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const { showError, showMessage } = useToast();
const { isBuilderConfigured, fetchStatus: fetchBuilderStatus } = useAgentBuilderStatus();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

const projectId = computed(
	() => (route.params.projectId as string) ?? projectsStore.personalProject?.id ?? '',
);
const agentId = computed(() => route.params.agentId as string);

// UI state
const {
	chatMode,
	chatModeOpened,
	isBuildChatStreaming,
	initialPrompt,
	onBuildChatStreamingChange,
	resetForAgentSwitch: resetChatModeForAgentSwitch,
} = useAgentChatMode();
/**
 * Gate for the main body render. Stays false while `initialize()` is running so
 * we don't:
 *   - flash the home screen for users who arrive with a `?prompt=…` query that
 *     will immediately transition them to the build chat, and
 *   - render the Test tab first on unbuilt agents only to flip it to Build
 *     once the config fetch resolves.
 */
const initialized = ref(false);
const agentName = ref('');
const agent = ref<AgentResource | null>(null);
const {
	activeChatSessionId,
	continueSessionId,
	effectiveSessionId,
	currentSessionHasMessages,
	currentSessionTitle,
	sessionMenu,
	setSessionInUrl,
	clearContinueSessionParam,
	onSessionPick,
	onNewChat,
} = useAgentBuilderSession();

const sessionOptions = computed<Array<N8nDropdownOption<string>>>(() =>
	sessionMenu.value.map((item) => ({
		value: item.id,
		label: item.when ? `${item.label} · ${item.when}` : (item.label ?? item.title),
		disabled: item.disabled,
	})),
);

const { chatColumnCollapsed, chatColumnWidth, onChatColumnResize, resizeGridSize } =
	useAgentBuilderLayout();
chatColumnCollapsed.value = false;

// Main tab state (Agent, Executions, Evaluations)
const selectedSection = ref<AgentBuilderSection>(null);

function getSectionFromQuery(section: unknown): AgentBuilderSection {
	const value = Array.isArray(section) ? section[0] : section;
	if (value === EXECUTIONS_SECTION_KEY || value === EVALS_SECTION_KEY || value === 'raw')
		return value;
	return null;
}

function getSectionFromTab(tab: AgentBuilderMainTab): AgentBuilderSection {
	if (tab === 'executions') return EXECUTIONS_SECTION_KEY;
	if (tab === 'evaluations') return EVALS_SECTION_KEY;
	if (tab === 'raw') return 'raw';
	return null;
}

async function setSelectedSection(section: AgentBuilderSection) {
	selectedSection.value = section;
	await router.replace({
		query: { ...route.query, [SECTION_QUERY_PARAM]: section ?? undefined },
	});
}

const activeMainTab = computed<AgentBuilderMainTab>({
	get() {
		if (selectedSection.value === EXECUTIONS_SECTION_KEY) return 'executions';
		if (selectedSection.value === EVALS_SECTION_KEY) return 'evaluations';
		if (selectedSection.value === 'raw') return 'raw';
		return 'agent';
	},
	set(tab) {
		void setSelectedSection(getSectionFromTab(tab));
	},
});

const mainTabOptions = computed(() => [
	{ label: locale.baseText('agents.builder.header.tab.agent'), value: 'agent' as const },
	{ label: locale.baseText('agents.builder.header.tab.executions'), value: 'executions' as const },
	{ label: 'Raw', value: 'raw' as const },
]);

const executionsDescription = computed(
	() =>
		`${sessionsStore.threads.length} ${sessionsStore.threads.length === 1 ? 'execution' : 'executions'}`,
);

// Config
const { config, fetchConfig, updateConfig } = useAgentConfig();
const localConfig = ref<AgentJsonConfig | null>(null);
const connectedTriggers = ref<string[]>([]);

const { ensureLoaded: ensureIntegrationsCatalog } = useAgentIntegrationsCatalog();

const builderTelemetry = useAgentBuilderTelemetry({
	agentId,
	projectId,
	agent,
	localConfig,
	savedConfig: config,
	connectedTriggers,
});

/**
 * An agent is considered "built" once it has instructions configured.
 * In that state the home screen + send flow routes to the chat endpoint
 * instead of the builder.
 */
const isBuilt = computed(() => !!localConfig.value?.instructions?.trim());

watch(
	config,
	(c) => {
		if (c) {
			localConfig.value = deepCopy(c);
		}
	},
	{ immediate: true },
);

const projectName = computed<string | null>(() => {
	if (projectsStore.personalProject?.id === projectId.value) {
		return locale.baseText('projects.menu.personal');
	}
	const current = projectsStore.currentProject;
	if (current && current.id === projectId.value) return current.name ?? null;
	const match = projectsStore.myProjects.find((p) => p.id === projectId.value);
	return match?.name ?? null;
});

async function fetchAgent() {
	// Capture the target id at call-time so a fetch that resolves after the
	// user has switched to a different agent is dropped instead of clobbering
	// the new agent's resource state.
	const targetAgentId = agentId.value;
	const data = await getAgent(rootStore.restApiContext, projectId.value, targetAgentId);
	if (agentId.value !== targetAgentId) return;
	agent.value = data;
	agentName.value = data.name;
}

function startChat(msg: string) {
	// Starting a fresh chat must never inherit a stale continue-session from a
	// previous URL — otherwise the new conversation would keep appending to the
	// old thread.
	if (continueSessionId.value) clearContinueSessionParam();
	if (isBuilt.value) {
		// Mint a fresh thread id and push it to the URL so the current chat is
		// persisted across reloads. Test and Build remain visually linked via
		// `chatModeOpened` (v-show) — Build doesn't share the thread, it uses
		// its own per-agent builder history.
		setSessionInUrl(crypto.randomUUID());
		initialPrompt.value = msg;
		chatMode.value = 'test';
		telemetry.track('User started agent chat', { agent_id: agentId.value });
	} else {
		// Fresh agent — route through the same build chat panel the Build tab
		// uses so the first-build experience matches the ongoing Build UX.
		initialPrompt.value = msg;
		chatMode.value = 'build';
		telemetry.track('User started agent build', { agent_id: agentId.value });
	}

	// Drop the seed prompt after the re-render that mounts the target panel.
	// Vue runs this child's setup during the render kicked off by the state
	// changes above, so `props.initialMessage` is captured synchronously in
	// the panel's setup before this callback fires. Leaving the prompt in
	// place would bleed the same message into whichever panel the user
	// opens next (e.g. clicking Build after starting a Test chat would
	// re-send the Test message to the builder and skip loadHistory).
	void nextTick(() => {
		initialPrompt.value = undefined;
	});
}

function onPublished(updated: AgentResource) {
	agent.value = updated;
}

function onUnpublished(updated: AgentResource) {
	agent.value = updated;
}

async function onReverted(updated: AgentResource) {
	agent.value = updated;
	agentName.value = updated.name;
	await fetchConfig(projectId.value, agentId.value);
	builderTelemetry.captureToolsBaseline();
}

/**
 * Pick the session the Test tab should bind to when no explicit one has been
 * chosen yet. Prefer the most recent thread — users land back where they left
 * off — and only mint a fresh ephemeral session when there is no history.
 */
function bindTestSession() {
	if (continueSessionId.value || activeChatSessionId.value) return;
	const latest = sessionsStore.threads?.[0];
	if (latest) {
		setSessionInUrl(latest.id);
		return;
	}
	// Still loading — defer the decision; the watcher below will rebind once
	// threads arrive, falling back to a fresh ephemeral session if the list
	// comes back empty.
	if (sessionsStore.loading) return;
	setSessionInUrl(crypto.randomUUID());
}

function setChatMode(next: ChatMode) {
	if (chatMode.value === next) return;
	// Test is locked until the agent has instructions — see chatModeOptions
	// which surfaces a tooltip explaining why. No-op on the click so the
	// user doesn't get bounced into a half-configured chat.
	if (next === 'test' && !isBuilt.value) return;
	chatMode.value = next;
	if (next === 'test') {
		// Restore the currently-bound Test session to the URL so refresh and
		// shared links point at the same chat.
		if (activeChatSessionId.value && !continueSessionId.value) {
			void router.replace({
				query: { ...route.query, [CONTINUE_SESSION_ID_PARAM]: activeChatSessionId.value },
			});
		} else {
			bindTestSession();
		}
	} else {
		// Build mode doesn't use continueSessionId — drop it from the URL so a
		// refresh while on Build doesn't bounce back to Test.
		if (continueSessionId.value) clearContinueSessionParam();
	}

	telemetry.track('User switched agent chat mode', {
		agent_id: agentId.value,
		mode: next,
	});
}

/**
 * Test is locked until the agent has instructions. Before that, chatting
 * would be meaningless — the agent has nothing to act on. Locking the tab
 * (rather than silently redirecting home→Build) keeps the UX honest: users
 * see WHY they can't chat yet instead of getting bounced to a different
 * surface after sending a message.
 *
 * This also closes the first-build cancellation hole: a mid-stream first
 * build is always `!isBuilt`, so the Test tab stays locked while the build
 * is in flight, preventing the tab-switch-unmounts-the-stream regression.
 */
const chatModeOptions = computed(() => [
	{ label: locale.baseText('agents.builder.chatMode.build'), value: 'build' as const },
	{
		label: locale.baseText('agents.builder.chatMode.test'),
		value: 'test' as const,
		disabled: !isBuilt.value,
	},
]);

function onOpenBuildFromChat() {
	// Triggered by the misconfigured-agent banner on the Test panel. Flip to
	// the Build tab so the user can finish setup without leaving the session.
	chatMode.value = 'build';
}

interface ConfigAutosaveSnapshot {
	type: 'config';
	projectId: string;
	agentId: string;
	config: AgentJsonConfig;
}

interface SkillAutosaveSnapshot {
	type: 'skill';
	projectId: string;
	agentId: string;
	skillId: string;
	skill: AgentSkill;
}

async function saveConfig(snapshot: ConfigAutosaveSnapshot): Promise<void> {
	const result = await updateConfig(snapshot.projectId, snapshot.agentId, snapshot.config);
	// Drop the response if the user has switched to a different agent in the
	// meantime — both `config` (handled inside useAgentConfig) and
	// `agent.versionId` would otherwise be polluted with values for the
	// previous agent.
	if (result.stale) return;
	if (agent.value && agent.value.id === snapshot.agentId && result.versionId !== undefined) {
		agent.value = { ...agent.value, versionId: result.versionId };
	}
}

async function saveSkill(snapshot: SkillAutosaveSnapshot): Promise<void> {
	const result = await updateAgentSkill(
		rootStore.restApiContext,
		snapshot.projectId,
		snapshot.agentId,
		snapshot.skillId,
		snapshot.skill,
	);
	if (agent.value?.id !== snapshot.agentId) return;
	agent.value = {
		...agent.value,
		versionId: result.versionId,
		skills: {
			...(agent.value.skills ?? {}),
			[snapshot.skillId]: result.skill,
		},
	};
}

// Debounce shorter than the workflow canvas' 1500ms — the publish button's
// "enabled" state is gated on the save landing, so a longer wait makes the
// UI feel laggy right after an edit.
const configAutosave = useAgentConfigAutosave<ConfigAutosaveSnapshot>({
	save: saveConfig,
	onSaved: () => {
		telemetry.track('User saved agent settings', { agent_id: agentId.value });
		builderTelemetry.flushConfigEdits();
	},
	onError: (error: unknown) => {
		// Intentionally keep pending parts: `localConfig` still holds the
		// failed edit, so the next successful autosave will persist it.
		// Surface backend validation errors (e.g. incompatible workflow-tool
		// triggers or body nodes) so the user isn't left wondering why their
		// edit didn't stick.
		showError(error, locale.baseText('agents.builder.saveError'));
	},
});
const skillAutosave = useAgentConfigAutosave<SkillAutosaveSnapshot>({
	save: saveSkill,
	onSaved: (snapshot) => {
		telemetry.track('User saved agent skill', {
			agent_id: snapshot.agentId,
			skill_id: snapshot.skillId,
		});
	},
	onError: (error: unknown) => {
		showError(error, locale.baseText('agents.builder.skills.saveError'));
	},
});
const saveStatus = computed(() => {
	if (configAutosave.saveStatus.value === 'saving' || skillAutosave.saveStatus.value === 'saving') {
		return 'saving';
	}
	if (configAutosave.saveStatus.value === 'saved' || skillAutosave.saveStatus.value === 'saved') {
		return 'saved';
	}
	return 'idle';
});

async function settleAutosave() {
	await Promise.all([configAutosave.settleAutosave(), skillAutosave.settleAutosave()]);
}

function onConfigFieldUpdate(updates: Partial<AgentJsonConfig>) {
	if (!localConfig.value) return;
	// Record BEFORE assigning so the composable can diff against the pre-update state.
	builderTelemetry.recordConfigEdit(updates);
	Object.assign(localConfig.value, updates);
	// Mirror identity edits onto the agent resource so the header reflects them
	// before the next fetch.
	if (updates.name !== undefined) {
		agentName.value = updates.name;
		if (agent.value) agent.value = { ...agent.value, name: updates.name };
	}
	configAutosave.scheduleAutosave({
		projectId: projectId.value,
		agentId: agentId.value,
		type: 'config',
		config: deepCopy(localConfig.value),
	});
}

async function onConfigUpdated() {
	await Promise.all([fetchAgent(), fetchConfig(projectId.value, agentId.value)]);
	builderTelemetry.trackToolsAdded();
}

const headerActions = [{ id: 'delete', label: locale.baseText('agents.builder.deleteAgent') }];

async function onHeaderAction(action: string) {
	if (action === 'delete') {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.delete.modal.title', {
				interpolate: { name: agentName.value },
			}),
			description: locale.baseText('agents.delete.modal.description', {
				interpolate: { name: agentName.value },
			}),
			confirmButtonText: locale.baseText('agents.delete.modal.button.delete'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return;

		// Cancel any pending autosave so it doesn't fire against the now-deleted
		// agent mid-navigation.
		await settleAutosave();
		const capturedProjectId = projectId.value;

		try {
			await deleteAgent(rootStore.restApiContext, capturedProjectId, agentId.value);
		} catch (error) {
			showError(error, 'Could not delete agent');
			return;
		}

		// Clear local agent state before router.replace so the component teardown
		// doesn't keep rendering data for an agent that no longer exists.
		agent.value = null;
		localConfig.value = null;
		agentsEventBus.emit('agentUpdated');

		// Target path. Built as a plain string rather than via a named route so
		// there's no risk of a named-route resolution race during the agent
		// component's teardown (a cause of the navigation silently failing).
		const targetPath = `/projects/${capturedProjectId}/agents`;

		try {
			await router.replace(targetPath);
		} catch {
			// Vue Router occasionally rejects with NavigationFailure during
			// teardown; fall through to the hard-navigate below so the user
			// always ends up on the list page.
		}

		// Safety net: if the SPA router didn't actually leave the agent route
		// (a guard rejected, a redirect kicked in, etc.), force a full browser
		// navigation to the list page. Without this, a failed SPA navigation
		// leaves the user stranded on a page for an agent that no longer
		// exists server-side.
		await nextTick();
		if (route.params.agentId) {
			window.location.assign(targetPath);
		}
	}
}

async function initialize() {
	initialized.value = false;
	// Flush any pending/in-flight save for the previous agent before we tear
	// down its state — without this, an autosave scheduled by edits in the
	// previous agent could land after we've already swapped to the new one.
	// The save itself snapshots agentId at schedule-time, so the persisted
	// data is correct; settling here keeps localConfig/agent state consistent.
	await settleAutosave();
	// Drop any per-agent telemetry state from the previous agent — an in-flight
	// save for the previous agent would've already flushed pending edits before
	// we got here, and a scheduled-but-not-fired save wouldn't flush correctly
	// against the new agent's id anyway.
	builderTelemetry.resetForAgentSwitch();

	agent.value = null;
	resetChatModeForAgentSwitch();
	activeChatSessionId.value = null;
	localConfig.value = null;
	connectedTriggers.value = [];

	// Refresh builder readiness so the empty-state CTA reflects the latest
	// admin configuration. Never blocks the rest of the load.
	void fetchBuilderStatus().catch((error: unknown) => {
		showError(error, locale.baseText('settings.agentBuilder.loadError'));
	});

	await fetchAgent();
	await fetchConfig(projectId.value, agentId.value);
	builderTelemetry.captureToolsBaseline();
	// Fire-and-forget: the interactive ask_credential tool card reads these
	// stores. Failures are non-fatal — the cards stay disabled until data lands.
	void credentialsStore.fetchAllCredentials({ projectId: projectId.value }).catch(() => undefined);
	void credentialsStore.fetchCredentialTypes(false).catch(() => undefined);
	// Stop any in-flight auto-refresh from the previous agent before kicking
	// off a new fetch — keeps the store tied to the current project/agent.
	sessionsStore.stopAutoRefresh();
	void sessionsStore.fetchThreads(projectId.value, agentId.value).then(() => {
		sessionsStore.startAutoRefresh();
	});
	void (async () => {
		// Non-fatal — on failure, leave connectedTriggers empty; the sidebar emit
		// will correct it once the user expands the Triggers section.
		const integrations = await ensureIntegrationsCatalog(projectId.value).catch(() => []);
		const triggerTypes = [...integrations.map((i) => i.type), AGENT_SCHEDULE_TRIGGER_TYPE];
		const connected = await builderTelemetry.fetchInitialTriggersBaseline(triggerTypes);
		if (connected) connectedTriggers.value = connected;
	})();

	// Default landing is Build. If the URL pins a specific chat session
	// (e.g. refresh, shared link, deep link from elsewhere) we honor it and
	// open Test so the user sees the chat they linked to.
	chatMode.value = continueSessionId.value && isBuilt.value ? 'test' : 'build';
	// Explicitly open the target mode. The `chatMode` watcher only fires on a
	// value change, but on agent-switch we just reset `chatModeOpened` above —
	// if both agents share the same default mode the watcher doesn't fire and
	// the chat panel's v-if gate stays false, leaving the chat pane blank.
	chatModeOpened.value[chatMode.value] = true;

	// If the user arrived via NewAgentView with a seed prompt, jump straight
	// into the build chat.
	const prompt = route.query.prompt as string | undefined;
	if (prompt) {
		void router.replace({ query: { ...route.query, prompt: undefined } });
		startChat(prompt);
	}

	initialized.value = true;
}

watch(agentId, initialize, { immediate: true });

watch(
	() => route.query[SECTION_QUERY_PARAM],
	(section) => {
		selectedSection.value = getSectionFromQuery(section);
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	sessionsStore.stopAutoRefresh();
});

watch(
	chatMode,
	(cm) => {
		chatModeOpened.value[cm] = true;
	},
	{ immediate: true },
);

// If the user is on Test before the sessions list finishes loading, latch onto
// the most recent thread as soon as it arrives. Also fires when loading
// finishes with no threads so we can mint a fresh ephemeral session instead
// of leaving the chat panel empty.
watch(
	() => sessionsStore.loading,
	(isLoading, wasLoading) => {
		if (!wasLoading || isLoading) return;
		if (chatMode.value !== 'test') return;
		if (continueSessionId.value || activeChatSessionId.value) return;
		bindTestSession();
	},
);

function exitContinueMode() {
	clearContinueSessionParam();
}

function onOpenAddToolModal() {
	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: localConfig.value?.tools ?? [],
			projectId: projectId.value,
			agentId: agentId.value,
			onConfirm: (tools: AgentJsonToolRef[]) => onConfigFieldUpdate({ tools }),
		},
	});
}

function onOpenAddTriggerModal(initialTriggerType?: string) {
	uiStore.openModalWithData({
		name: AGENT_ADD_TRIGGER_MODAL_KEY,
		data: {
			initialTriggerType,
			projectId: projectId.value,
			agentId: agentId.value,
			agentName: agentName.value,
			isPublished: Boolean(agent.value?.publishedVersion),
			connectedTriggers: connectedTriggers.value,
			onConnectedTriggersChange: (triggers: string[]) => onConnectedTriggersUpdate(triggers),
			onTriggerAdded: (payload: { triggerType: string; triggers: string[] }) =>
				onTriggerAdded(payload),
			onAgentPublished: (updated: AgentResource) => onPublished(updated),
		},
	});
}

function onOpenToolFromList(index: number) {
	const tools = localConfig.value?.tools ?? [];
	const tool = tools[index];
	if (!tool) return;
	uiStore.openModalWithData({
		name: AGENT_TOOL_CONFIG_MODAL_KEY,
		data: {
			toolRef: tool,
			existingToolNames: tools
				.map((ref, i) => (i === index ? null : ref.name))
				.filter((name): name is string => !!name),
			onConfirm: (updatedTool: AgentJsonToolRef) => {
				const nextTools = [...(localConfig.value?.tools ?? [])];
				nextTools[index] = updatedTool;
				onConfigFieldUpdate({ tools: nextTools });
			},
			onRemove: () => onRemoveTool(index),
		},
	});
}

function onOpenSkillFromList(id: string) {
	const skill = appliedSkills.value.find((s) => s.id === id)?.skill;
	if (!skill) return;
	uiStore.openModalWithData({
		name: AGENT_SKILL_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			existingSkillIds: Object.keys(agent.value?.skills ?? {}),
			skill,
			skillId: id,
			onRemove: (skillId: string) => onRemoveSkill(skillId),
			onConfirm: ({ id: skillId, skill: updatedSkill }: { id: string; skill: AgentSkill }) => {
				if (agent.value?.id !== agentId.value) return;
				agent.value = {
					...agent.value,
					skills: {
						...(agent.value.skills ?? {}),
						[skillId]: updatedSkill,
					},
				};
				const nextSkills = [...(localConfig.value?.skills ?? [])];
				const skillRefIndex = nextSkills.findIndex((ref) => ref.id === id);
				if (skillRefIndex !== -1) {
					nextSkills[skillRefIndex] = { type: 'skill', id: skillId };
					onConfigFieldUpdate({ skills: nextSkills });
				}
			},
		},
	});
}

function onRemoveTool(index: number) {
	const currentTools = localConfig.value?.tools ?? [];
	if (index < 0 || index >= currentTools.length) return;
	const nextTools = currentTools.filter((_, i) => i !== index);
	onConfigFieldUpdate({ tools: nextTools });
}

function onRemoveSkill(id: string) {
	const currentSkills = localConfig.value?.skills ?? [];
	const nextSkills = currentSkills.filter((ref) => ref.id !== id);
	onConfigFieldUpdate({ skills: nextSkills });
}

function onOpenAddSkillModal() {
	const existingSkillIds = new Set(Object.keys(agent.value?.skills ?? {}));
	for (const ref of localConfig.value?.skills ?? []) {
		if (ref.id) existingSkillIds.add(ref.id);
	}

	uiStore.openModalWithData({
		name: AGENT_SKILL_MODAL_KEY,
		data: {
			projectId: projectId.value,
			agentId: agentId.value,
			existingSkillIds: [...existingSkillIds],
			onConfirm: ({ id, skill }: { id: string; skill: AgentSkill }) => {
				void (async () => {
					let created: AgentSkill;
					let versionId: string | null;
					try {
						const result = await createAgentSkill(
							rootStore.restApiContext,
							projectId.value,
							agentId.value,
							id,
							skill,
						);
						created = result.skill;
						versionId = result.versionId;
					} catch (error) {
						showError(error, locale.baseText('agents.builder.skills.create.error'));
						return;
					}
					if (agent.value?.id !== agentId.value) return;
					agent.value = {
						...agent.value,
						versionId,
						skills: {
							...(agent.value.skills ?? {}),
							[id]: created,
						},
					};
					onConfigFieldUpdate({
						skills: [...(localConfig.value?.skills ?? []), { type: 'skill', id }],
					});
					showMessage({
						title: locale.baseText('agents.builder.skills.added'),
						type: 'success',
					});
				})();
			},
		},
	});
}

const appliedSkills = computed<Array<{ id: string; skill: AgentSkill }>>(() => {
	const refs = localConfig.value?.skills ?? [];
	const seen = new Set<string>();
	const out: Array<{ id: string; skill: AgentSkill }> = [];

	for (const ref of refs) {
		if (!ref.id || seen.has(ref.id)) continue;
		seen.add(ref.id);
		out.push({
			id: ref.id,
			skill: agent.value?.skills?.[ref.id] ?? {
				name: ref.id,
				description: '',
				instructions: '',
			},
		});
	}

	return out;
});

function onQuickActionAddTool(tools: AgentJsonToolRef[]) {
	onConfigFieldUpdate({ tools });
}

function onConnectedTriggersUpdate(triggers: string[]) {
	connectedTriggers.value = triggers;
	builderTelemetry.trackTriggerListChanged(triggers);
}

function onTriggerAdded(payload: { triggerType: string; triggers: string[] }) {
	connectedTriggers.value = payload.triggers;
	builderTelemetry.trackTriggerAdded(payload);
}

function onContinueLoaded(count: number) {
	// Only kick away from a URL-supplied session when the URL points at a
	// missing/stale thread. A real thread can legitimately have zero persisted
	// chat messages if its execution failed before history was saved.
	const requestedSessionId = continueSessionId.value;
	const knownThread = requestedSessionId
		? sessionsStore.threads.some((thread) => thread.id === requestedSessionId)
		: false;

	if (count === 0 && requestedSessionId && !knownThread) {
		exitContinueMode();
		// `exitContinueMode` only drops the query param; the chat panel would
		// otherwise sit blank waiting for a session to bind. Once the route
		// update lands, latch onto an existing thread (or mint a fresh
		// ephemeral one) so the test pane has something to render.
		void nextTick(() => {
			if (chatMode.value === 'test') bindTestSession();
		});
	}
}

function onSwitchAgent(nextAgentId: string) {
	if (!nextAgentId || nextAgentId === agentId.value) return;
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: nextAgentId },
	});
}
</script>

<template>
	<div :class="$style.root">
		<AgentBuilderHeader
			:agent="agent"
			:project-id="projectId"
			:agent-id="agentId"
			:project-name="projectName"
			:header-actions="headerActions"
			:save-status="saveStatus"
			:before-revert-to-published="settleAutosave"
			@header-action="onHeaderAction"
			@published="onPublished"
			@unpublished="onUnpublished"
			@reverted="onReverted"
			@switch-agent="onSwitchAgent"
		/>
		<div :class="$style.builder">
			<!-- Column 1: chat -->
			<N8nResizeWrapper
				:class="$style.chatColumnResizeWrapper"
				:width="chatColumnWidth"
				:min-width="320"
				:grid-size="resizeGridSize"
				:supported-directions="chatColumnCollapsed ? [] : ['right']"
				:is-resizing-enabled="!chatColumnCollapsed"
				@resize="onChatColumnResize"
			>
				<aside
					:class="$style.chatColumn"
					:aria-label="locale.baseText('agents.builder.chatColumn.ariaLabel')"
					data-testid="agent-builder-chat-column"
				>
					<div
						v-if="initialized && chatMode === 'test' && effectiveSessionId"
						:class="$style.sessionHeader"
						data-testid="agent-chat-session-header"
					>
						<N8nDropdown
							:options="sessionOptions"
							data-testid="agent-chat-session-picker"
							@select="onSessionPick"
						>
							<template #trigger>
								<N8nButton
									variant="ghost"
									size="small"
									:class="$style.sessionTitleBtn"
									:aria-label="locale.baseText('agents.builder.chat.sessionPicker.ariaLabel')"
								>
									{{ currentSessionTitle }}
									<N8nIcon icon="chevron-down" color="text-light" :size="12" />
								</N8nButton>
							</template>
						</N8nDropdown>
						<N8nTooltip
							placement="left"
							:content="locale.baseText('agents.builder.chat.newChat.ariaLabel')"
						>
							<N8nButton
								v-if="currentSessionHasMessages"
								variant="ghost"
								iconOnly
								size="small"
								:class="$style.newChatBtn"
								:aria-label="locale.baseText('agents.builder.chat.newChat.ariaLabel')"
								data-testid="agent-chat-new-chat-btn"
								@click="onNewChat"
							>
								<N8nIcon icon="plus" :size="14" />
							</N8nButton>
						</N8nTooltip>
					</div>
					<div :class="$style.chatBody">
						<AgentChatPanel
							v-if="initialized && chatModeOpened.test && effectiveSessionId"
							v-show="chatMode === 'test'"
							:key="`test-${effectiveSessionId}`"
							:project-id="projectId"
							:agent-id="agentId"
							mode="inline"
							endpoint="chat"
							:initial-message="initialPrompt"
							:continue-session-id="effectiveSessionId"
							:agent-config="localConfig"
							:agent-status="deriveAgentStatus(agent)"
							:connected-triggers="connectedTriggers"
							@config-updated="onConfigUpdated"
							@continue-loaded="onContinueLoaded"
							@open-build="onOpenBuildFromChat"
						>
							<template #footer-start>
								<N8nTooltip
									v-if="initialized"
									:class="$style.chatModeToggle"
									:disabled="isBuilt"
									:content="locale.baseText('agents.builder.chatMode.test.lockedTooltip')"
									:show-after="100"
									placement="top"
								>
									<N8nRadioButtons
										:model-value="chatMode"
										:options="chatModeOptions"
										:aria-label="locale.baseText('agents.builder.chatMode.ariaLabel')"
										data-testid="agent-chat-mode-toggle"
										@update:model-value="setChatMode"
									>
										<template #option="option">
											<span :class="$style.chatModeOption">
												<N8nIcon
													v-if="option.value === 'build' && isBuildChatStreaming"
													icon="loader-circle"
													:size="14"
													:spin="true"
												/>
												<N8nIcon
													v-else-if="option.value === 'test' && !isBuilt"
													icon="triangle-alert"
													:size="14"
													:class="$style.chatModeLockedIcon"
												/>
												<N8nIcon
													v-else
													:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
													:size="14"
												/>
												<span>{{ option.label }}</span>
											</span>
										</template>
									</N8nRadioButtons>
								</N8nTooltip>
							</template>
						</AgentChatPanel>
						<AgentChatPanel
							v-if="initialized && chatModeOpened.build"
							v-show="chatMode === 'build' && isBuilderConfigured"
							:project-id="projectId"
							:agent-id="agentId"
							mode="inline"
							endpoint="build"
							:initial-message="chatMode === 'build' ? initialPrompt : undefined"
							:agent-config="localConfig"
							:agent-status="deriveAgentStatus(agent)"
							:connected-triggers="connectedTriggers"
							@config-updated="onConfigUpdated"
							@update:streaming="onBuildChatStreamingChange"
						>
							<template #above-input>
								<div :class="$style.quickActionsRow">
									<AgentChatQuickActions
										:tools="localConfig?.tools ?? []"
										:project-id="projectId"
										:agent-id="agentId"
										:agent-name="agentName"
										:is-published="Boolean(agent?.publishedVersion)"
										:connected-triggers="connectedTriggers"
										@update:tools="onQuickActionAddTool"
										@update:connected-triggers="onConnectedTriggersUpdate"
										@trigger-added="onTriggerAdded"
										@agent-published="onPublished"
									/>
								</div>
							</template>
							<template #footer-start>
								<N8nTooltip
									v-if="initialized"
									:class="$style.chatModeToggle"
									:disabled="isBuilt"
									:content="locale.baseText('agents.builder.chatMode.test.lockedTooltip')"
									:show-after="100"
									placement="top"
								>
									<N8nRadioButtons
										:model-value="chatMode"
										:options="chatModeOptions"
										:aria-label="locale.baseText('agents.builder.chatMode.ariaLabel')"
										data-testid="agent-chat-mode-toggle"
										@update:model-value="setChatMode"
									>
										<template #option="option">
											<span :class="$style.chatModeOption">
												<N8nIcon
													v-if="option.value === 'build' && isBuildChatStreaming"
													icon="loader-circle"
													:size="14"
													:spin="true"
												/>
												<N8nIcon
													v-else-if="option.value === 'test' && !isBuilt"
													icon="triangle-alert"
													:size="14"
													:class="$style.chatModeLockedIcon"
												/>
												<N8nIcon
													v-else
													:icon="option.value === 'build' ? 'wand-sparkles' : 'message-square'"
													:size="14"
												/>
												<span>{{ option.label }}</span>
											</span>
										</template>
									</N8nRadioButtons>
								</N8nTooltip>
							</template>
						</AgentChatPanel>
						<AgentBuilderUnconfiguredEmptyState
							v-if="chatModeOpened.build && !isBuilderConfigured"
						/>
					</div>
				</aside>
			</N8nResizeWrapper>

			<!-- Column 2: editor -->
			<section
				:class="$style.editorColumn"
				:aria-label="locale.baseText('agents.builder.editorColumn.ariaLabel')"
				data-testid="agent-builder-editor-column"
			>
				<div :class="$style.panelArea">
					<div :class="$style.panelAreaContainer">
						<div :class="$style.panelHeaderRow">
							<AgentIdentityHeader
								v-if="activeMainTab === 'agent'"
								:config="localConfig"
								:disabled="isBuildChatStreaming"
								@update:config="onConfigFieldUpdate"
							/>
							<AgentPanelHeader
								v-else-if="activeMainTab === 'executions'"
								title="Executions"
								:description="executionsDescription"
							/>
							<AgentPanelHeader
								v-else-if="activeMainTab === 'raw'"
								title="Raw"
								description="Agent JSON configuration"
							/>
							<div v-else />
							<N8nRadioButtons
								:model-value="activeMainTab"
								:options="mainTabOptions"
								:class="$style.mainTabs"
								data-testid="agent-header-tabs"
								@update:model-value="activeMainTab = $event"
							/>
						</div>

						<!-- Agent tab: consolidated panels -->
						<div v-if="activeMainTab === 'agent'" :class="$style.agentCards">
							<AgentCapabilitiesSection
								:config="localConfig"
								:tools="localConfig?.tools ?? []"
								:skills="appliedSkills"
								:connected-triggers="connectedTriggers"
								:disabled="isBuildChatStreaming"
								:project-id="projectId"
								:agent-id="agentId"
								:is-published="Boolean(agent?.publishedVersion)"
								@open-tool="onOpenToolFromList"
								@open-skill="onOpenSkillFromList"
								@open-trigger="onOpenAddTriggerModal"
								@add-tool="onOpenAddToolModal"
								@add-skill="onOpenAddSkillModal"
								@add-trigger="onOpenAddTriggerModal"
								@remove-tool="onRemoveTool"
								@remove-skill="onRemoveSkill"
								@update:connected-triggers="onConnectedTriggersUpdate"
								@trigger-added="onTriggerAdded"
							/>
							<div :class="$style.panel">
								<AgentInfoPanel
									:config="localConfig"
									:disabled="isBuildChatStreaming"
									embedded
									@update:config="onConfigFieldUpdate"
								/>
							</div>

							<N8nCard variant="outlined" :class="$style.card">
								<AgentMemoryPanel
									:config="localConfig"
									:disabled="isBuildChatStreaming"
									embedded
									@update:config="onConfigFieldUpdate"
								/>
							</N8nCard>

							<N8nCard variant="outlined" :class="$style.card">
								<AgentAdvancedPanel
									:config="localConfig"
									:disabled="isBuildChatStreaming"
									collapsible
									@update:config="onConfigFieldUpdate"
								/>
							</N8nCard>
						</div>

						<!-- Executions tab -->
						<AgentSessionsListView
							v-else-if="activeMainTab === 'executions'"
							data-testid="agent-executions-panel"
						/>

						<div v-else-if="activeMainTab === 'raw'">
							<AgentConfigJsonEditor
								:config="localConfig"
								:read-only="isBuildChatStreaming"
								@update:config="onConfigFieldUpdate"
							/>
						</div>

						<!-- Evaluations tab (placeholder) -->
						<div v-else data-testid="agent-evaluations-panel">
							<div :class="$style.panel">
								<N8nHeading size="medium">Evaluations</N8nHeading>
								<N8nText color="text-light"> Evaluations functionality is coming soon. </N8nText>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.builder {
	display: grid;
	height: 100%;
	min-height: 0;
	overflow: hidden;
	grid-template-columns: var(--agent-chat-column-width, 460px) 1fr;
}

.chatColumnResizeWrapper {
	min-width: 0;
	min-height: 0;
	overflow: hidden;
}

.chatColumn {
	position: relative;
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	border-right: var(--border);
	height: 100%;
	min-height: 0;
	min-width: 0;
	overflow: hidden;
}

.quickActionsRow {
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: var(--spacing--2xs);
	width: 100%;
}

.sessionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--sm);
	height: var(--height--2xl);
	border-bottom: var(--border);
	min-height: 36px;
}

.sessionTitleBtn {
	gap: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	margin-left: calc(var(--spacing--5xs) * -1);
}

.sessionTitleText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.newChatBtn {
	color: var(--text-color--subtle);

	&:hover,
	&:focus-visible {
		color: var(--text-color);
	}
}

/* The session picker can grow with the thread list — cap it at ~5 visible rows
   so it never eats the whole viewport. `.agent-chat-session-menu` is the
   popper class we pass through to `N8nNavigationDropdown`'s submenuClass prop;
   it's teleported, so the rule has to escape the CSS-module scope. */
:global(.agent-chat-session-menu) :global(.el-menu) {
	max-height: 220px;
	max-width: 360px;
	min-width: 280px;
	overflow-y: auto;
}

/* Each row is title (truncated) + right-aligned timestamp. We render both
   inside the design-system's append slot (the bare title text node can't host
   an ellipsis); override the slot wrapper's right-align so the row flexes
   across the full menu width instead of clinging to the right edge. */
:global(.agent-chat-session-menu) :global(.el-menu-item) {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	overflow: hidden;
}

:global(.agent-chat-session-menu) :global(.el-menu-item) > span {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	margin-left: 0;
	padding-left: 0;
}

.sessionItemLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionItemWhen {
	margin-left: auto;
	flex-shrink: 0;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.chatModeToggle {
	flex-shrink: 0;
}

.chatModeOption {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chatModeLockedIcon {
	color: var(--text-color--warning);
}

.chatBody {
	flex: 1;
	min-height: 0;
	overflow: hidden;
	display: flex;
}

.chatBody > * {
	flex: 1;
	min-height: 0;
}

.editorColumn {
	display: flex;
	flex-direction: column;
	background-color: var(--background--surface);
	min-height: 0;
	min-width: 0;
}

.panelArea {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	background-color: light-dark(
		var(--color--background--light-1),
		var(--color--background--light-2)
	);
	overflow: auto;
}

.panelAreaContainer {
	position: relative;
	max-width: 72rem;
	width: 100%;
	padding: var(--spacing--sm);
	margin: 0 auto;
	height: 100%;
}

.panelHeaderRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg) var(--spacing--lg) 0;

	> *:first-child {
		width: 100%;
	}
	> .mainTabs {
		margin-left: auto;
	}
}

.agentCards {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: var(--spacing--lg);
	width: 100%;
	margin: 0 auto;
}

.panel {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.card {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.rawCard {
	display: flex;
}
</style>
