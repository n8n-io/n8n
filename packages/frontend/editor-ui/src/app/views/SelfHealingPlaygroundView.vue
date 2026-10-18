<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { N8nButton, N8nCallout, N8nCard, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { getWorkflow, getWorkflows, activateWorkflow } from '@/app/api/workflows';
import type { IWorkflowDb } from '@/Interface';
import type { IExecutionsListResponse } from '@/features/execution/executions/executions.types';
import {
	PREFIX,
	createWorkflow,
	getScenarios,
	identifyWorkflow,
	type PlaygroundScenario,
} from './selfHealingPlayground';

const i18n = useI18n();
const root = useRootStore();
const settings = useSettingsStore();
const workflowsStore = useWorkflowsStore();
const projectsStore = useProjectsStore();
const scenarios = getScenarios(i18n);
const projectId = ref('');
const busy = ref(false);
const message = ref('');
const error = ref('');
const workflows = ref<IWorkflowDb[]>([]);
const executions = ref<Record<string, IExecutionsListResponse['results']>>({});
const responses = ref<Record<string, string>>({});
const enabled = computed(() => settings.moduleSettings['instance-ai']?.workflowSuggestionsEnabled);

function published(workflow: IWorkflowDb) {
	return Boolean(workflow.activeVersionId && workflow.activeVersionId === workflow.versionId);
}

async function refresh() {
	const collected: IWorkflowDb[] = [];
	let skip = 0;
	let count = 0;
	do {
		const page = await getWorkflows(
			root.restApiContext,
			{ name: PREFIX },
			{ take: 100, skip, sortBy: 'createdAt:desc' },
		);
		collected.push(...page.data);
		skip += page.data.length;
		count = page.count;
		if (page.data.length === 0) break;
	} while (skip < count);
	// List responses omit node parameters. Load only the playground workflows.
	const loaded: IWorkflowDb[] = [];
	for (const summary of collected) {
		if (!summary.name.startsWith(PREFIX)) continue;
		const workflow = await getWorkflow(root.restApiContext, summary.id);
		if (!identifyWorkflow(workflow, scenarios)) continue;
		loaded.push(workflow);
		const result = await makeRestApiRequest<IExecutionsListResponse>(
			root.restApiContext,
			'GET',
			'/executions',
			{
				filter: { workflowId: workflow.id },
				limit: 5,
			},
		);
		executions.value[workflow.id] = result.results;
	}
	workflows.value = loaded;
}

async function perform(action: () => Promise<void>) {
	if (busy.value) return;
	busy.value = true;
	error.value = '';
	message.value = '';
	try {
		await action();
	} catch (cause) {
		error.value =
			cause instanceof Error ? cause.message : i18n.baseText('selfHealingPlayground.failed');
	} finally {
		busy.value = false;
	}
}

async function publish(workflow: IWorkflowDb) {
	await activateWorkflow(root.restApiContext, workflow.id, { versionId: workflow.versionId });
	message.value = i18n.baseText('selfHealingPlayground.published');
	await refresh();
}

async function create(scenario: PlaygroundScenario) {
	const workflow = await workflowsStore.createNewWorkflow(
		createWorkflow(scenario, projectId.value),
	);
	try {
		await activateWorkflow(root.restApiContext, workflow.id, { versionId: workflow.versionId });
		message.value = i18n.baseText('selfHealingPlayground.created');
	} finally {
		await refresh();
	}
}

async function sendInput(id: string, alternate: boolean) {
	const workflow = await getWorkflow(root.restApiContext, id);
	if (!published(workflow) || workflow.isArchived)
		throw new Error(i18n.baseText('selfHealingPlayground.needsPublish'));
	const identity = identifyWorkflow(workflow, scenarios);
	if (!identity) throw new Error(i18n.baseText('selfHealingPlayground.unknown'));
	const response = await fetch(`${root.webhookUrl}/${identity.path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(alternate ? identity.scenario.alternateInput : identity.scenario.input),
		signal: AbortSignal.timeout(30000),
	});
	responses.value[id] = `HTTP ${response.status}\n${(await response.text()).slice(0, 6000)}`;
	if (response.status === 404) error.value = i18n.baseText('selfHealingPlayground.notRegistered');
	else
		message.value = i18n.baseText('selfHealingPlayground.sent', {
			interpolate: { status: response.status },
		});
	await refresh();
}

onMounted(
	async () =>
		await perform(async () => {
			await projectsStore.getMyProjects();
			await projectsStore.getPersonalProject();
			projectId.value =
				projectsStore.myProjects.find((project) => project.name === 'Self-healing test')?.id ??
				projectsStore.personalProject?.id ??
				projectsStore.myProjects[0]?.id ??
				'';
			await refresh();
		}),
);
</script>

<template>
	<div :class="$style.page" data-test-id="self-healing-playground">
		<header :class="$style.row">
			<h1>{{ i18n.baseText('selfHealingPlayground.title') }}</h1>
			<RouterLink to="/inbox">{{ i18n.baseText('selfHealingPlayground.inbox') }}</RouterLink>
		</header>
		<p>{{ i18n.baseText('selfHealingPlayground.intro') }}</p>
		<N8nCallout v-if="!enabled" theme="warning">{{
			i18n.baseText('selfHealingPlayground.disabled')
		}}</N8nCallout>
		<N8nCallout v-if="error" theme="danger" data-test-id="playground-error">{{ error }}</N8nCallout>
		<N8nCallout v-if="message" theme="success" data-test-id="playground-message">{{
			message
		}}</N8nCallout>
		<div :class="$style.row">
			<label :class="$style.project">
				{{ i18n.baseText('selfHealingPlayground.project') }}
				<N8nSelect v-model="projectId" :disabled="busy" data-test-id="playground-project">
					<N8nOption
						v-for="project in projectsStore.myProjects"
						:key="project.id"
						:value="project.id"
						:label="project.name ?? project.id"
					/>
				</N8nSelect>
			</label>
			<RouterLink v-if="projectId" :to="`/projects/${projectId}/settings`">{{
				i18n.baseText('selfHealingPlayground.settings')
			}}</RouterLink>
		</div>
		<div :class="$style.scenarios">
			<N8nCard v-for="scenario in scenarios" :key="scenario.id" :class="$style.card">
				<h2>{{ scenario.name }}</h2>
				<p>{{ scenario.description }}</p>
				<small>{{ scenario.outcome }}</small>
				<N8nButton
					:disabled="busy || !projectId"
					:data-test-id="`create-${scenario.id}`"
					@click="perform(() => create(scenario))"
					>{{ i18n.baseText('selfHealingPlayground.create') }}</N8nButton
				>
			</N8nCard>
		</div>
		<div :class="$style.row">
			<h2>{{ i18n.baseText('selfHealingPlayground.workflows') }}</h2>
			<N8nButton :disabled="busy" variant="outline" @click="perform(refresh)">{{
				i18n.baseText('selfHealingPlayground.refresh')
			}}</N8nButton>
		</div>
		<p>{{ i18n.baseText('selfHealingPlayground.blocked') }}</p>
		<p v-if="!workflows.length">{{ i18n.baseText('selfHealingPlayground.empty') }}</p>
		<N8nCard
			v-for="workflow in workflows"
			:key="workflow.id"
			:class="$style.card"
			data-test-id="playground-workflow"
		>
			<div :class="$style.row">
				<h3>{{ workflow.name }}</h3>
				<span>{{
					i18n.baseText(
						workflow.isArchived
							? 'selfHealingPlayground.state.archived'
							: published(workflow)
								? 'selfHealingPlayground.state.published'
								: 'selfHealingPlayground.state.draft',
					)
				}}</span>
			</div>
			<p>{{ identifyWorkflow(workflow, scenarios)?.scenario.expectation }}</p>
			<div :class="$style.actions">
				<N8nButton
					:disabled="busy || !published(workflow) || workflow.isArchived"
					@click="perform(() => sendInput(workflow.id, false))"
					>{{ i18n.baseText('selfHealingPlayground.original') }}</N8nButton
				>
				<N8nButton
					variant="outline"
					:disabled="busy || !published(workflow) || workflow.isArchived"
					@click="perform(() => sendInput(workflow.id, true))"
					>{{ i18n.baseText('selfHealingPlayground.alternate') }}</N8nButton
				>
				<N8nButton
					v-if="!published(workflow) && !workflow.isArchived"
					:disabled="busy"
					@click="perform(() => publish(workflow))"
					>{{ i18n.baseText('selfHealingPlayground.publish') }}</N8nButton
				>
				<RouterLink :to="`/workflow/${workflow.id}`">{{
					i18n.baseText('selfHealingPlayground.openWorkflow')
				}}</RouterLink>
				<RouterLink :to="`/workflow/${workflow.id}/executions`">{{
					i18n.baseText('selfHealingPlayground.executions')
				}}</RouterLink>
			</div>
			<div
				v-for="execution in executions[workflow.id]"
				:key="execution.id"
				:class="$style.execution"
			>
				<RouterLink :to="`/workflow/${workflow.id}/executions/${execution.id}`"
					>#{{ execution.id }} · {{ execution.status }}</RouterLink
				><span>{{ execution.mode }}</span
				><span>{{
					execution.startedAt ? new Date(execution.startedAt).toLocaleString() : ''
				}}</span>
			</div>
			<p v-if="!executions[workflow.id]?.length">
				{{ i18n.baseText('selfHealingPlayground.noExecutions') }}
			</p>
			<details>
				<summary>{{ i18n.baseText('selfHealingPlayground.inputs') }}</summary>
				<pre>{{
					JSON.stringify(identifyWorkflow(workflow, scenarios)?.scenario.input, null, 2)
				}}</pre>
				<pre>{{
					JSON.stringify(identifyWorkflow(workflow, scenarios)?.scenario.alternateInput, null, 2)
				}}</pre>
				<h4>{{ i18n.baseText('selfHealingPlayground.response') }}</h4>
				<pre>{{ responses[workflow.id] ?? i18n.baseText('selfHealingPlayground.noResponse') }}</pre>
			</details>
		</N8nCard>
	</div>
</template>

<style module lang="scss">
.page {
	padding: var(--spacing--lg);
	overflow: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
}
.row,
.actions,
.execution {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--sm);
}
.row {
	justify-content: space-between;
}
.project {
	flex: 0 1 40%;
}
.scenarios {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.execution {
	font-size: var(--font-size--sm);
}
.page pre {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
}
.page h1 {
	font-size: var(--font-size--2xl);
}
.page h2 {
	font-size: var(--font-size--lg);
}
</style>
