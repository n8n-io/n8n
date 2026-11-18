<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nIcon,
	N8nOption,
	N8nSelect,
	useMessage,
} from '@n8n/design-system';
import type { BadgeVariant, IconName } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type {
	SelfHealingConfigurationDto,
	StartSelfHealingAgentInvestigationResponse,
} from '@n8n/api-types';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import { MODAL_CONFIRM } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getWorkflow, getWorkflows, activateWorkflow } from '@/app/api/workflows';
import {
	archiveAgent,
	connectIntegration,
	createAgent,
	deleteAgent,
	getAgent,
	getAgentConfig,
	getAgentWebhookUrl,
	listAgents,
	publishAgent,
	updateAgentConfig,
} from '@/features/agents/composables/useAgentApi';
import { getThreadDetail } from '@/features/agents/composables/useAgentThreadsApi';
import {
	createDraftDataset,
	deleteDraftDataset,
	getDatasets,
} from '@/features/agents/agentEvals.api';
import type { AgentResource } from '@/features/agents/types';
import type { IWorkflowDb } from '@/Interface';
import {
	TEXT,
	buildAgentConfig,
	buildConfigurationPayload,
	buildEvalRows,
	buildWebhookRequest,
	createToolWorkflow,
	firstLookupTool,
	getScenarios,
	identifyWorkflow,
	isPlaygroundConfiguration,
	mintAgentId,
	readToolNames,
	readWebhookReply,
	webhookThreadId,
	type PlaygroundScenario,
	type PlaygroundTool,
	type ToolKey,
} from './agentSelfHealingPlayground';

interface PlaygroundRun {
	key: string;
	scenario: PlaygroundScenario;
	runId: string;
	agentId: string;
	tools: Array<{ workflow: IWorkflowDb; tool: PlaygroundTool }>;
	agent: AgentResource | null;
}

const root = useRootStore();
const settings = useSettingsStore();
const users = useUsersStore();
const message = useMessage();
const workflowsStore = useWorkflowsStore();
const workflowsListStore = useWorkflowsListStore();
const projectsStore = useProjectsStore();
const scenarios = getScenarios();
const projectId = ref('');
const busy = ref(true);
const runSection = ref<HTMLElement>();
const activeAction = ref('');
const notice = ref('');
const error = ref('');
const runs = ref<PlaygroundRun[]>([]);
const configurations = ref<SelfHealingConfigurationDto[]>([]);
const sessionLogs = ref<Record<string, string>>({});

const enabled = computed(() => settings.moduleSettings['instance-ai']?.workflowSuggestionsEnabled);
const availableProjects = computed(() => projectsStore.myProjects);
const settingsPath = computed(() => {
	const project = availableProjects.value.find(({ id }) => id === projectId.value);
	return `/projects/${projectId.value}/${project?.type === 'personal' ? 'self-healing' : 'settings'}`;
});
const configurationsPath = computed(
	() => `/projects/${projectId.value}/self-healing-configurations`,
);

function outcome(scenario: PlaygroundScenario): { variant: BadgeVariant; icon: IconName } {
	if (scenario.id === 'healthy') return { variant: 'success', icon: 'circle-check' };
	return { variant: 'info', icon: 'sparkles' };
}

function agentState(agent: AgentResource | null) {
	if (!agent || agent.isArchived) return TEXT.stateMissing;
	return agent.activeVersionId && agent.activeVersionId === agent.versionId
		? TEXT.statePublished
		: TEXT.stateDraft;
}

/** The enabled configuration that covers the agent. An explicit selection wins over `all`. */
function configurationFor(agentId: string) {
	const active = configurations.value.filter((configuration) => configuration.enabled);
	return (
		active.find((configuration) => configuration.agentIds.includes(agentId)) ??
		active.find((configuration) => configuration.agentScope === 'all')
	);
}

function configurationPath(agentId: string) {
	const inSettings = settingsPath.value.endsWith('settings');
	return `${settingsPath.value}/${inSettings ? 'self-healing/' : ''}${configurationFor(agentId)?.id}`;
}

function configurationSummary(agentId: string) {
	const configuration = configurationFor(agentId);
	return configuration
		? TEXT.configurationSummary(
				configuration.id,
				configuration.agentPublicationMode,
				configuration.agentTraceThreshold,
			)
		: '';
}

function reason(cause: unknown) {
	return cause instanceof Error ? cause.message : TEXT.failed;
}

async function findPlaygroundWorkflows() {
	const found: IWorkflowDb[] = [];
	let skip = 0;
	let count = 0;
	do {
		const page = await getWorkflows(
			root.restApiContext,
			{ projectId: projectId.value },
			{ take: 100, skip, sortBy: 'createdAt:desc' },
			// The list query can sort only by a selected column.
			['id', 'name', 'nodes', 'createdAt'],
		);
		for (const summary of page.data) {
			// A tool workflow of the playground has two nodes.
			if (summary.nodes && summary.nodes.length !== 2) continue;
			const workflow = await getWorkflow(root.restApiContext, summary.id);
			if (identifyWorkflow(workflow, scenarios)) found.push(workflow);
		}
		skip += page.data.length;
		count = page.count;
		if (page.data.length === 0) break;
	} while (skip < count);
	return found;
}

async function refresh() {
	if (!projectId.value) {
		runs.value = [];
		return;
	}
	configurations.value = enabled.value
		? await makeRestApiRequest<SelfHealingConfigurationDto[]>(
				root.restApiContext,
				'GET',
				configurationsPath.value,
			)
		: [];
	const groups = new Map<string, PlaygroundRun>();
	for (const workflow of await findPlaygroundWorkflows()) {
		const identity = identifyWorkflow(workflow, scenarios);
		if (!identity) continue;
		const { scenario, runId, agentId, tool } = identity;
		const run = groups.get(runId) ?? {
			key: runId,
			scenario,
			runId,
			agentId,
			tools: [],
			agent: null,
		};
		run.tools.push({ workflow, tool });
		groups.set(runId, run);
	}
	for (const run of groups.values()) {
		try {
			run.agent = await getAgent(root.restApiContext, projectId.value, run.agentId);
		} catch {
			run.agent = null;
		}
	}
	runs.value = [...groups.values()];
}

async function perform(action: () => Promise<void>, actionId = '') {
	if (busy.value) return;
	busy.value = true;
	activeAction.value = actionId;
	error.value = '';
	notice.value = '';
	try {
		await action();
	} catch (cause) {
		error.value = reason(cause);
	} finally {
		busy.value = false;
		activeAction.value = '';
	}
}

async function removeWorkflow(id: string) {
	const workflow = await getWorkflow(root.restApiContext, id);
	if (!identifyWorkflow(workflow, scenarios)) return;
	if (!workflow.isArchived) await workflowsStore.archiveWorkflow(workflow.id, workflow.checksum);
	await workflowsListStore.deleteWorkflow(workflow.id);
}

/** Delete the data of one run. Return false when a part of it stays. */
async function removeRun(agentId: string, workflowIds: string[]) {
	const context = root.restApiContext;
	let complete = true;
	const attempt = async (step: () => Promise<unknown>) => {
		try {
			await step();
		} catch {
			complete = false;
		}
	};
	for (const configuration of configurations.value) {
		if (!isPlaygroundConfiguration(configuration, agentId)) continue;
		await attempt(
			async () =>
				await makeRestApiRequest(
					context,
					'DELETE',
					`${configurationsPath.value}/${configuration.id}`,
				),
		);
	}
	let agent: AgentResource | null = null;
	try {
		agent = await getAgent(context, projectId.value, agentId);
	} catch {
		// The agent is already deleted.
	}
	if (agent) {
		try {
			for (const dataset of await getDatasets(context, projectId.value, agentId)) {
				await deleteDraftDataset(context, projectId.value, agentId, dataset.id);
			}
		} catch {
			// The eval routes are off for this user, or the suite has runs. The agent deletion continues.
		}
		const archived = agent.isArchived;
		await attempt(async () => {
			if (!archived) await archiveAgent(context, projectId.value, agentId);
			await deleteAgent(context, projectId.value, agentId);
		});
	}
	for (const id of workflowIds) await attempt(async () => await removeWorkflow(id));
	return complete;
}

async function removeRuns(targets: PlaygroundRun[]) {
	let failed = 0;
	for (const run of targets) {
		const complete = await removeRun(
			run.agentId,
			run.tools.map(({ workflow }) => workflow.id),
		);
		if (!complete) failed++;
		delete sessionLogs.value[run.key];
	}
	return failed;
}

async function resetPlayground() {
	await refresh();
	if (!runs.value.length) return;
	const count = runs.value.length;
	const choice = await message.confirm(TEXT.resetDescription(count), TEXT.resetTitle, {
		type: 'warning',
		confirmButtonText: TEXT.resetConfirm,
	});
	if (choice !== MODAL_CONFIRM) return;
	const failed = await removeRuns(runs.value);
	await refresh();
	if (failed) error.value = TEXT.resetPartial(failed);
	else notice.value = TEXT.resetDone(count);
}

async function createAndPublish(data: WorkflowDataCreate) {
	const workflow = await workflowsStore.createNewWorkflow(data);
	await activateWorkflow(root.restApiContext, workflow.id, { versionId: workflow.versionId });
	return workflow;
}

/** The model of another agent in the project, for an instance where a new agent gets no default model. */
async function findModel(excludedAgentId: string) {
	const context = root.restApiContext;
	const agents = await listAgents(context, projectId.value);
	for (const { id } of agents.filter((agent) => agent.id !== excludedAgentId).slice(0, 20)) {
		try {
			const { config } = await getAgentConfig(context, projectId.value, id);
			if (config.model && config.credential) {
				return { model: config.model, credential: config.credential };
			}
		} catch {
			// An agent without a configuration cannot give its model.
		}
	}
	throw new Error(TEXT.noModel);
}

async function createAgentForScenario(
	scenario: PlaygroundScenario,
	agentId: string,
	workflowIds: Record<ToolKey, string>,
) {
	const context = root.restApiContext;
	// A create without a configuration lets the backend select the default model.
	await createAgent(context, projectId.value, scenario.agentName, { id: agentId });
	const { config, configHash } = await getAgentConfig(context, projectId.value, agentId);
	const model = config.model && config.credential ? {} : await findModel(agentId);
	await updateAgentConfig(
		context,
		projectId.value,
		agentId,
		buildAgentConfig({ ...config, ...model }, scenario, workflowIds),
		configHash,
	);
	// The webhook channel gives production sessions that each project member can read.
	await connectIntegration(context, projectId.value, agentId, 'webhook', '', {
		authentication: 'none',
	});
	await publishAgent(context, projectId.value, agentId);
}

async function createEvalSuite(scenario: PlaygroundScenario, agentId: string) {
	if (!scenario.evalCases.length) return;
	const context = root.restApiContext;
	const { dataTableId, columnMapping } = await createDraftDataset(
		context,
		projectId.value,
		agentId,
		{ datasetName: `${scenario.agentName} checks` },
	);
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId.value}/data-tables/${dataTableId}/insert`,
		{ returnType: 'count', data: buildEvalRows(scenario, columnMapping) },
	);
}

async function sendTurn(url: string, input: string, conversationId?: string) {
	const response = await fetch(`${url}/responses`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(buildWebhookRequest(input, conversationId)),
		signal: AbortSignal.timeout(180000),
	});
	const reply = readWebhookReply(await response.json());
	if (!response.ok) throw new Error(`HTTP ${response.status}: ${reply.text}`);
	return reply;
}

/** Send each scripted session. Send the correction when the agent did not start with the expected tool. */
async function sendSessions(scenario: PlaygroundScenario, agentId: string, key: string) {
	const context = root.restApiContext;
	const { url } = await getAgentWebhookUrl(context, projectId.value, agentId);
	const lines: string[] = [];
	let wrong = 0;
	for (const session of scenario.sessions) {
		const { conversationId } = await sendTurn(url, session.input);
		let tools: string[] = [];
		if (conversationId) {
			const detail = await getThreadDetail(
				context,
				projectId.value,
				agentId,
				webhookThreadId(agentId, conversationId),
			);
			tools = readToolNames(detail.executions);
		}
		const corrected = firstLookupTool(tools) !== session.expectedTool;
		if (corrected) {
			wrong++;
			await sendTurn(url, session.correction, conversationId);
		}
		lines.push(TEXT.sessionLine(session.input, tools, corrected));
		sessionLogs.value[key] = lines.join('\n');
	}
	return TEXT.sessionsSent(scenario.sessions.length, wrong);
}

async function create(scenario: PlaygroundScenario) {
	const userId = users.currentUserId;
	if (!userId) throw new Error(TEXT.failed);
	const notes: string[] = [TEXT.created];
	try {
		// A new run of a test replaces the earlier run of the same test.
		await removeRuns(runs.value.filter((run) => run.scenario.id === scenario.id));
		const run = { runId: crypto.randomUUID(), agentId: mintAgentId() };
		const created: string[] = [];
		try {
			const workflowIds: Partial<Record<ToolKey, string>> = {};
			for (const tool of scenario.tools) {
				const data = createToolWorkflow(scenario, tool, projectId.value, run);
				const { id } = await createAndPublish(data);
				created.push(id);
				workflowIds[tool.key] = id;
			}
			const { customer, order } = workflowIds;
			if (!customer || !order) throw new Error(TEXT.failed);
			await createAgentForScenario(scenario, run.agentId, { customer, order });
			await makeRestApiRequest<SelfHealingConfigurationDto>(
				root.restApiContext,
				'POST',
				configurationsPath.value,
				buildConfigurationPayload(scenario, run.agentId, userId),
			);
		} catch (cause) {
			await removeRun(run.agentId, created);
			throw cause;
		}
		try {
			await createEvalSuite(scenario, run.agentId);
		} catch (cause) {
			notes.push(TEXT.evalSuiteSkipped(reason(cause)));
		}
		try {
			if (scenario.sessions.length) {
				notes.push(await sendSessions(scenario, run.agentId, run.runId));
			}
		} catch (cause) {
			notes.push(TEXT.sessionsFailed(reason(cause)));
		}
		notice.value = notes.join(' ');
	} finally {
		await refresh();
		await nextTick();
		runSection.value?.focus();
	}
}

async function runNow(run: PlaygroundRun) {
	await refresh();
	const configuration = configurationFor(run.agentId);
	if (!configuration) throw new Error(TEXT.noConfiguration);
	const result = await makeRestApiRequest<StartSelfHealingAgentInvestigationResponse>(
		root.restApiContext,
		'POST',
		`${configurationsPath.value}/${configuration.id}/agent-investigations`,
		{ agentId: run.agentId },
	);
	if (result.status === 'not_eligible') {
		throw new Error(TEXT.runNowResult.not_eligible(result.reason));
	}
	notice.value = TEXT.runNowResult[result.status];
}

async function changeProject() {
	runs.value = [];
	await perform(refresh);
}

onMounted(async () => {
	busy.value = false;
	await perform(async () => {
		await projectsStore.getMyProjects();
		projectId.value =
			availableProjects.value.find((project) => project.name === 'Self-healing test')?.id ??
			availableProjects.value[0]?.id ??
			'';
		await refresh();
	});
});
</script>

<template>
	<div :class="$style.page" data-test-id="agent-self-healing-playground">
		<div :class="$style.content">
			<header :class="$style.header">
				<div :class="$style.titleGroup">
					<span :class="$style.heroIcon"><N8nIcon icon="flask-conical" size="large" /></span>
					<div>
						<p :class="$style.eyebrow">{{ TEXT.eyebrow }}</p>
						<h1>{{ TEXT.title }}</h1>
						<p :class="$style.subtle">{{ TEXT.intro }}</p>
					</div>
				</div>
				<RouterLink to="/inbox" :class="$style.inboxLink">
					<N8nIcon icon="inbox" />{{ TEXT.inbox }}
					<N8nIcon icon="arrow-right" />
				</RouterLink>
			</header>

			<N8nCallout v-if="!enabled" theme="warning">{{ TEXT.disabled }}</N8nCallout>
			<div role="alert">
				<N8nCallout v-if="error" theme="danger" data-test-id="playground-error">{{
					error
				}}</N8nCallout>
			</div>
			<div role="status" aria-live="polite">
				<N8nCallout v-if="notice" theme="success" data-test-id="playground-message">{{
					notice
				}}</N8nCallout>
			</div>

			<N8nCard :class="$style.card">
				<div :class="$style.setup">
					<div :class="$style.project">
						<label for="playground-project">{{ TEXT.project }}</label>
						<N8nSelect
							id="playground-project"
							v-model="projectId"
							:disabled="busy"
							data-test-id="playground-project"
							@update:model-value="changeProject"
						>
							<N8nOption
								v-for="project in availableProjects"
								:key="project.id"
								:value="project.id"
								:label="project.name ?? project.id"
							/>
						</N8nSelect>
					</div>
					<div :class="$style.links">
						<RouterLink v-if="projectId" :to="settingsPath">
							<N8nIcon icon="settings" size="small" />{{ TEXT.settings }}
						</RouterLink>
						<RouterLink v-if="projectId" :to="`/projects/${projectId}/agents`">{{
							TEXT.openProject
						}}</RouterLink>
						<RouterLink to="/settings/assistant">{{ TEXT.assistantSettings }}</RouterLink>
					</div>
				</div>
				<ol :class="$style.guide" :aria-label="TEXT.guide">
					<li v-for="(step, index) in TEXT.steps" :key="step.title">
						<span :class="$style.stepNumber" aria-hidden="true">{{ index + 1 }}</span>
						<div>
							<strong>{{ step.title }}</strong>
							<p :class="$style.subtle">{{ step.description }}</p>
						</div>
					</li>
				</ol>
			</N8nCard>
			<N8nCallout v-if="!busy && !availableProjects.length" theme="warning">
				{{ TEXT.noProjects }}
			</N8nCallout>

			<section :class="$style.section" aria-labelledby="playground-scenarios">
				<div>
					<h2 id="playground-scenarios">{{ TEXT.scenariosTitle }}</h2>
					<p :class="$style.subtle">{{ TEXT.scenariosDescription }}</p>
				</div>
				<div :class="$style.grid">
					<N8nCard
						v-for="scenario in scenarios"
						:key="scenario.id"
						:class="[$style.card, { [$style.recommended]: scenario.id === 'wrong-tool' }]"
					>
						<div :class="$style.scenario">
							<div :class="$style.row">
								<N8nBadge
									:variant="outcome(scenario).variant"
									:leading-icon="outcome(scenario).icon"
									>{{ scenario.outcome }}</N8nBadge
								>
								<span v-if="scenario.id === 'wrong-tool'" :class="$style.meta">{{
									TEXT.recommended
								}}</span>
							</div>
							<h3>{{ scenario.name }}</h3>
							<p :class="$style.subtle">{{ scenario.description }}</p>
							<N8nButton
								:class="$style.createButton"
								:variant="scenario.id === 'wrong-tool' ? 'solid' : 'outline'"
								size="small"
								:disabled="busy || !projectId || !enabled"
								:loading="activeAction === `create-${scenario.id}`"
								:data-test-id="`create-${scenario.id}`"
								@click="perform(() => create(scenario), `create-${scenario.id}`)"
							>
								<template #icon><N8nIcon icon="plus" size="small" /></template>
								{{ TEXT.create }}
							</N8nButton>
						</div>
					</N8nCard>
				</div>
			</section>

			<section
				ref="runSection"
				:class="$style.section"
				tabindex="-1"
				aria-labelledby="playground-runs"
				:aria-busy="busy"
			>
				<div :class="$style.row">
					<div>
						<h2 id="playground-runs">
							{{ TEXT.runsTitle }}
							<span :class="$style.count">{{ runs.length }}</span>
						</h2>
						<p :class="$style.subtle">{{ TEXT.runsDescription }}</p>
					</div>
					<div :class="$style.actions">
						<N8nButton
							variant="destructive"
							size="small"
							:disabled="busy || !runs.length"
							:loading="activeAction === 'reset'"
							data-test-id="playground-reset"
							@click="perform(resetPlayground, 'reset')"
							>{{ TEXT.reset }}</N8nButton
						>
						<N8nButton
							:disabled="busy"
							:loading="activeAction === 'refresh'"
							variant="outline"
							size="small"
							@click="perform(refresh, 'refresh')"
						>
							<template #icon><N8nIcon icon="refresh-cw" size="small" /></template
							>{{ TEXT.refresh }}
						</N8nButton>
					</div>
				</div>
				<div v-if="!runs.length" :class="$style.empty">
					<N8nIcon icon="flask-conical" size="large" />
					<h3>{{ busy ? TEXT.loading : TEXT.emptyTitle }}</h3>
					<p v-if="!busy">{{ TEXT.empty }}</p>
				</div>
				<N8nCard
					v-for="run in runs"
					:key="run.key"
					:class="$style.card"
					data-test-id="playground-run"
				>
					<div :class="$style.run">
						<div :class="$style.row">
							<h3>
								{{ run.scenario.name }}
								<span :class="$style.meta">{{ run.runId.slice(0, 8) }}</span>
							</h3>
							<N8nBadge
								:variant="outcome(run.scenario).variant"
								:leading-icon="outcome(run.scenario).icon"
								>{{ run.scenario.outcome }}</N8nBadge
							>
						</div>
						<p :class="$style.expectation">
							<N8nIcon icon="crosshair" size="small" />
							<strong>{{ TEXT.expectation }}</strong>
							{{ run.scenario.expectation }}
						</p>
						<ul :class="$style.parts">
							<li data-test-id="playground-agent">
								<span :class="$style.meta">{{ TEXT.agent }}</span>
								<strong>{{ run.agent?.name ?? run.scenario.agentName }}</strong>
								<N8nBadge
									:variant="agentState(run.agent) === TEXT.statePublished ? 'subtle' : 'warning'"
									>{{ agentState(run.agent) }}</N8nBadge
								>
								<span v-if="run.agent" :class="$style.rowEnd">
									<RouterLink :to="`/projects/${projectId}/agents/${run.agentId}/sessions`">{{
										TEXT.sessions
									}}</RouterLink>
									<RouterLink :to="`/projects/${projectId}/agents/${run.agentId}`"
										>{{ TEXT.open }}<N8nIcon icon="arrow-up-right" size="small"
									/></RouterLink>
								</span>
							</li>
							<li v-for="{ workflow, tool } in run.tools" :key="workflow.id">
								<span :class="$style.meta">{{ TEXT.tool }}</span>
								<strong>{{ tool.name }}</strong>
								<span :class="$style.subtle">{{ workflow.name }}</span>
								<span :class="$style.rowEnd">
									<RouterLink :to="`/workflow/${workflow.id}`"
										>{{ TEXT.open }}<N8nIcon icon="arrow-up-right" size="small"
									/></RouterLink>
								</span>
							</li>
							<li data-test-id="playground-configuration">
								<span :class="$style.meta">{{ TEXT.configuration }}</span>
								<template v-if="configurationFor(run.agentId)">
									<span>{{ configurationSummary(run.agentId) }}</span>
									<span :class="$style.rowEnd">
										<RouterLink :to="configurationPath(run.agentId)"
											>{{ TEXT.open }}<N8nIcon icon="arrow-up-right" size="small"
										/></RouterLink>
									</span>
								</template>
								<span v-else :class="$style.subtle">{{ TEXT.noConfiguration }}</span>
							</li>
						</ul>
						<div :class="$style.actions">
							<N8nButton
								size="small"
								:disabled="busy || !run.agent || !configurationFor(run.agentId)"
								:loading="activeAction === `run-${run.key}`"
								data-test-id="playground-run-now"
								@click="perform(() => runNow(run), `run-${run.key}`)"
							>
								<template #icon><N8nIcon icon="play" size="small" /></template>{{ TEXT.runNow }}
							</N8nButton>
							<N8nButton
								size="small"
								variant="outline"
								:disabled="busy || !run.agent || !run.scenario.sessions.length"
								:loading="activeAction === `sessions-${run.key}`"
								data-test-id="playground-send-sessions"
								@click="
									perform(async () => {
										notice = await sendSessions(run.scenario, run.agentId, run.key);
									}, `sessions-${run.key}`)
								"
							>
								<template #icon><N8nIcon icon="send" size="small" /></template
								>{{ TEXT.sendSessions }}
							</N8nButton>
							<RouterLink to="/inbox">{{ TEXT.inbox }}</RouterLink>
						</div>
						<details :class="$style.details">
							<summary>{{ TEXT.sessionLog }}</summary>
							<pre>{{
								sessionLogs[run.key] ??
								(run.scenario.sessions.length ? TEXT.sessionLogEmpty : TEXT.noSessions)
							}}</pre>
							<template v-if="run.scenario.sessions.length">
								<h4>{{ TEXT.sessionScript }}</h4>
								<pre>{{ JSON.stringify(run.scenario.sessions, null, 2) }}</pre>
							</template>
						</details>
					</div>
				</N8nCard>
			</section>
			<aside :class="$style.troubleshooting">
				<N8nIcon icon="circle-help" />
				<div>
					<h3>{{ TEXT.troubleshootingTitle }}</h3>
					<p>{{ TEXT.troubleshooting }}</p>
				</div>
			</aside>
		</div>
	</div>
</template>

<style module lang="scss">
.page {
	width: 100%;
	min-width: 0;
	height: 100%;
	overflow: auto;
	background: var(--background--subtle);
	color: var(--text-color);
	padding: var(--spacing--xl);
	container-type: inline-size;
}
.content {
	// Keep instructions readable on wide screens; there is no page-width token.
	max-width: 1080px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
.content :is(h1, h2, h3, h4, p, ol, ul) {
	margin: 0;
}
.content h1 {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}
.content h2 {
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
}
.content :is(h3, h4) {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}
.content a {
	color: var(--text-color);
}
.content a:hover {
	text-decoration: underline;
}
.content [role='alert']:empty,
.content [role='status']:empty {
	display: none;
}
.header,
.row,
.actions,
.links,
.titleGroup,
.inboxLink,
.rowEnd {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}
.header,
.row,
.setup {
	justify-content: space-between;
}
.header {
	align-items: flex-start;
}
.titleGroup {
	flex-wrap: nowrap;
	align-items: flex-start;
}
.heroIcon {
	display: grid;
	place-items: center;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}
.eyebrow,
.meta {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
}
.eyebrow {
	font-weight: var(--font-weight--bold);
}
.subtle {
	color: var(--text-color--subtle);
}
.inboxLink {
	gap: var(--spacing--2xs);
	border: var(--border);
	background: var(--background--surface);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius--xs);
	font-weight: var(--font-weight--medium);
}
.card {
	--card--padding: var(--spacing--lg);
	box-shadow: none;
	border-radius: var(--radius--sm);
}
.setup {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--lg);
	flex-wrap: wrap;
	padding-bottom: var(--spacing--md);
	border-bottom: var(--border);
}
.project {
	flex: 0 1 40%;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.project label {
	font-weight: var(--font-weight--bold);
}
.links {
	font-size: var(--font-size--xs);
}
.links a,
.rowEnd a {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
.guide {
	list-style: none;
	padding: var(--spacing--md) 0 0;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--lg);
}
.guide li {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}
.guide p {
	font-size: var(--font-size--xs);
}
.stepNumber {
	border: var(--border);
	border-radius: var(--radius--full);
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	display: grid;
	place-items: center;
	flex-shrink: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	background: var(--background--subtle);
}
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	scroll-margin-top: var(--spacing--lg);
}
.grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}
.scenario,
.run {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	height: 100%;
}
.scenario > p {
	flex: 1;
}
.createButton {
	align-self: flex-start;
	margin-top: var(--spacing--2xs);
}
.recommended {
	border-color: var(--border-color--strong);
}
.count {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	margin-left: var(--spacing--2xs);
	font-weight: var(--font-weight--regular);
}
.empty {
	border: var(--border);
	border-style: dashed;
	border-radius: var(--radius--sm);
	padding: var(--spacing--xl);
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
}
.expectation {
	display: flex;
	align-items: baseline;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
}
.parts {
	list-style: none;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--xs);
}
.parts li {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--xs);
}
.parts li + li {
	border-top: var(--border);
}
.rowEnd {
	margin-left: auto;
}
.details {
	border-top: var(--border);
	padding-top: var(--spacing--xs);
	font-size: var(--font-size--xs);
}
.details summary {
	cursor: pointer;
	color: var(--text-color--subtle);
}
.details[open] summary {
	margin-bottom: var(--spacing--sm);
}
.details pre {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	padding: var(--spacing--sm);
	margin: var(--spacing--2xs) 0 var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
}
.troubleshooting {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) 0 var(--spacing--lg);
	color: var(--text-color--subtle);
}
.troubleshooting h3 {
	font-size: var(--font-size--sm);
	margin-bottom: var(--spacing--4xs);
}
.troubleshooting p {
	font-size: var(--font-size--xs);
}
// Collapse by available content width, including when the sidebar is open.
@container (max-width: 700px) {
	.guide,
	.grid {
		grid-template-columns: 1fr;
	}
	.project {
		flex-basis: 100%;
	}
}
</style>
