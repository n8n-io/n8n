<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
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
const workflowsListStore = useWorkflowsListStore();
const projectsStore = useProjectsStore();
const scenarios = getScenarios(i18n);
const projectId = ref('');
const busy = ref(true);
const resetOpen = ref(false);
const configurationState = ref<'unchecked' | 'configured' | 'missing' | 'error'>('unchecked');
const configurations = ref<SelfHealingConfigurationDto[]>([]);
const workflowSection = ref<HTMLElement>();
const activeAction = ref('');
const message = ref('');
const messageTheme = ref<'success' | 'info'>('success');
const error = ref('');
const workflows = ref<IWorkflowDb[]>([]);
const executions = ref<Record<string, IExecutionsListResponse['results']>>({});
const responses = ref<Record<string, string>>({});
const workflowCards = computed(() =>
	workflows.value.map((workflow) => ({
		workflow,
		scenario: identifyWorkflow(workflow, scenarios)?.scenario,
		latest: executions.value[workflow.id]?.[0],
	})),
);
const enabled = computed(() => settings.moduleSettings['instance-ai']?.workflowSuggestionsEnabled);
const configurationMessage = computed(() =>
	i18n.baseText(
		configurationState.value === 'error'
			? 'selfHealingPlayground.configurationCheckFailed'
			: 'selfHealingPlayground.configurationRequired',
	),
);
const availableProjects = computed(() => projectsStore.myProjects);
const settingsPath = computed(() => {
	const project = availableProjects.value.find((project) => project.id === projectId.value);
	return `/projects/${projectId.value}/${project?.type === 'personal' ? 'self-healing' : 'settings'}`;
});

function published(workflow: IWorkflowDb) {
	return Boolean(workflow.activeVersionId && workflow.activeVersionId === workflow.versionId);
}

function canRun(workflowId: string) {
	return Boolean(
		enabled.value &&
			configurationState.value === 'configured' &&
			configurations.value.some(
				(configuration) =>
					configuration.enabled &&
					(configuration.scope === 'all' || configuration.workflowIds.includes(workflowId)),
			),
	);
}

async function refresh() {
	await checkConfiguration();
	if (!projectId.value) {
		workflows.value = [];
		return;
	}
	const collected: IWorkflowDb[] = [];
	let skip = 0;
	let count = 0;
	do {
		const page = await getWorkflows(
			root.restApiContext,
			{ name: PREFIX, projectId: projectId.value },
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

async function checkConfiguration() {
	configurationState.value = 'unchecked';
	configurations.value = [];
	if (!projectId.value || !enabled.value) return;
	try {
		configurations.value = await makeRestApiRequest<SelfHealingConfigurationDto[]>(
			root.restApiContext,
			'GET',
			`/projects/${projectId.value}/self-healing-configurations`,
		);
		configurationState.value = configurations.value.length > 0 ? 'configured' : 'missing';
	} catch {
		configurationState.value = 'error';
	}
}

async function perform(action: () => Promise<void>, actionId = '') {
	if (busy.value) return;
	busy.value = true;
	activeAction.value = actionId;
	error.value = '';
	message.value = '';
	messageTheme.value = 'success';
	try {
		await action();
	} catch (cause) {
		error.value =
			cause instanceof Error ? cause.message : i18n.baseText('selfHealingPlayground.failed');
	} finally {
		busy.value = false;
		activeAction.value = '';
	}
}

async function publish(workflow: IWorkflowDb) {
	await activateWorkflow(root.restApiContext, workflow.id, { versionId: workflow.versionId });
	message.value = i18n.baseText('selfHealingPlayground.published');
	await refresh();
}

async function prepareReset() {
	await refresh();
	resetOpen.value = workflows.value.length > 0;
}

async function resetPlayground() {
	const targets = [...workflows.value];
	resetOpen.value = false;
	let deleted = 0;
	let failed = 0;
	for (const target of targets) {
		try {
			const workflow = await getWorkflow(root.restApiContext, target.id);
			if (!identifyWorkflow(workflow, scenarios)) {
				failed++;
				continue;
			}
			if (!workflow.isArchived) {
				await workflowsStore.archiveWorkflow(workflow.id, workflow.checksum);
			}
			await workflowsListStore.deleteWorkflow(workflow.id);
			delete executions.value[workflow.id];
			delete responses.value[workflow.id];
			deleted++;
		} catch {
			failed++;
		}
	}
	await refresh();
	if (failed) {
		error.value = i18n.baseText('selfHealingPlayground.reset.partial', {
			interpolate: { deleted, failed },
		});
	} else {
		message.value = i18n.baseText('selfHealingPlayground.reset.done', {
			interpolate: { count: deleted },
		});
	}
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
		await nextTick();
		workflowSection.value?.focus();
	}
}

async function sendInput(id: string, alternate: boolean) {
	await checkConfiguration();
	if (!canRun(id)) {
		throw new Error(
			configurationState.value === 'error'
				? configurationMessage.value
				: i18n.baseText('selfHealingPlayground.workflowConfigurationRequired'),
		);
	}
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
	messageTheme.value = 'info';
	responses.value[id] = `HTTP ${response.status}\n${(await response.text()).slice(0, 6000)}`;
	if (response.status === 404) error.value = i18n.baseText('selfHealingPlayground.notRegistered');
	else
		message.value = i18n.baseText('selfHealingPlayground.sent', {
			interpolate: { status: response.status },
		});
	await refresh();
}

async function changeProject() {
	workflows.value = [];
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
	<div :class="$style.page" data-test-id="self-healing-playground">
		<div :class="$style.content">
			<header :class="$style.header">
				<div :class="$style.titleGroup">
					<span :class="$style.heroIcon"><N8nIcon icon="flask-conical" size="large" /></span>
					<div>
						<p :class="$style.eyebrow">{{ i18n.baseText('selfHealingPlayground.eyebrow') }}</p>
						<h1>{{ i18n.baseText('selfHealingPlayground.title') }}</h1>
					</div>
				</div>
				<RouterLink to="/inbox" :class="$style.inboxLink">
					<N8nIcon icon="inbox" />{{ i18n.baseText('selfHealingPlayground.inbox') }}
					<N8nIcon icon="arrow-right" />
				</RouterLink>
			</header>
			<p :class="$style.intro">{{ i18n.baseText('selfHealingPlayground.intro') }}</p>

			<ol :class="$style.guide" :aria-label="i18n.baseText('selfHealingPlayground.guide')">
				<li v-for="step in ['configure', 'trigger', 'review'] as const" :key="step">
					<span :class="$style.stepNumber" aria-hidden="true">{{
						{ configure: 1, trigger: 2, review: 3 }[step]
					}}</span>
					<div>
						<strong>{{ i18n.baseText(`selfHealingPlayground.guide.${step}.title`) }}</strong>
						<p>{{ i18n.baseText(`selfHealingPlayground.guide.${step}.description`) }}</p>
					</div>
				</li>
			</ol>

			<N8nCallout v-if="!enabled" theme="warning">{{
				i18n.baseText('selfHealingPlayground.disabled')
			}}</N8nCallout>
			<div role="alert">
				<N8nCallout v-if="error" theme="danger" data-test-id="playground-error">{{
					error
				}}</N8nCallout>
			</div>
			<div role="status" aria-live="polite">
				<N8nCallout v-if="message" :theme="messageTheme" data-test-id="playground-message">{{
					message
				}}</N8nCallout>
			</div>

			<N8nCard :class="$style.setup">
				<div :class="$style.setupContent">
					<div :class="$style.setupCopy">
						<h2>{{ i18n.baseText('selfHealingPlayground.setup.title') }}</h2>
						<p>{{ i18n.baseText('selfHealingPlayground.projectTypes') }}</p>
						<p>{{ i18n.baseText('selfHealingPlayground.setup.description') }}</p>
						<div :class="$style.links">
							<RouterLink v-if="projectId" :to="settingsPath">
								<N8nIcon icon="settings" size="small" />{{
									i18n.baseText('selfHealingPlayground.settings')
								}}
							</RouterLink>
							<RouterLink to="/settings/assistant">{{
								i18n.baseText('selfHealingPlayground.assistantSettings')
							}}</RouterLink>
							<N8nButton
								v-if="projectId && enabled"
								variant="outline"
								size="small"
								:disabled="busy"
								@click="perform(checkConfiguration)"
							>
								{{ i18n.baseText('selfHealingPlayground.checkSetup') }}
							</N8nButton>
						</div>
					</div>
					<div :class="$style.project">
						<label for="playground-project">{{
							i18n.baseText('selfHealingPlayground.project')
						}}</label>
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
						<RouterLink v-if="projectId" :to="`/projects/${projectId}`">{{
							i18n.baseText('selfHealingPlayground.openProject')
						}}</RouterLink>
					</div>
				</div>
			</N8nCard>
			<N8nCallout v-if="!busy && !availableProjects.length" theme="warning">
				{{ i18n.baseText('selfHealingPlayground.noProjects') }}
			</N8nCallout>
			<N8nCallout
				v-if="!busy && projectId && enabled && configurationState !== 'configured'"
				theme="warning"
				data-test-id="playground-configuration-required"
			>
				<p>{{ configurationMessage }}</p>
				<div :class="$style.links">
					<RouterLink :to="settingsPath">{{
						i18n.baseText('selfHealingPlayground.settings')
					}}</RouterLink>
				</div>
			</N8nCallout>

			<section :class="$style.section" aria-labelledby="playground-scenarios">
				<div>
					<h2 id="playground-scenarios">
						{{ i18n.baseText('selfHealingPlayground.scenarios.title') }}
					</h2>
					<p :class="$style.sectionDescription">
						{{ i18n.baseText('selfHealingPlayground.scenarios.description') }}
					</p>
				</div>
				<div :class="$style.scenarios">
					<N8nCard
						v-for="scenario in scenarios"
						:key="scenario.id"
						:class="[$style.scenario, { [$style.recommended]: scenario.id === 'wrong-field' }]"
					>
						<div :class="$style.scenarioBody">
							<div :class="$style.row">
								<span
									:class="[
										$style.outcome,
										scenario.id === 'healthy'
											? $style.success
											: scenario.id === 'unavailable-service'
												? $style.warning
												: $style.info,
									]"
								>
									<N8nIcon
										:icon="
											scenario.id === 'healthy'
												? 'circle-check'
												: scenario.id === 'unavailable-service'
													? 'circle-help'
													: 'sparkles'
										"
										size="small"
									/>{{ scenario.outcome }}
								</span>
								<span v-if="scenario.id === 'wrong-field'" :class="$style.recommendedLabel">{{
									i18n.baseText('selfHealingPlayground.recommended')
								}}</span>
							</div>
							<h3>{{ scenario.name }}</h3>
							<p>{{ scenario.description }}</p>
							<div :class="$style.scenarioFooter">
								<N8nButton
									:variant="scenario.id === 'wrong-field' ? 'solid' : 'outline'"
									size="small"
									:disabled="busy || !projectId"
									:loading="activeAction === `create-${scenario.id}`"
									:data-test-id="`create-${scenario.id}`"
									@click="perform(() => create(scenario), `create-${scenario.id}`)"
								>
									<template #icon><N8nIcon icon="plus" size="small" /></template>
									{{ i18n.baseText('selfHealingPlayground.create') }}
								</N8nButton>
								<span>{{ i18n.baseText('selfHealingPlayground.autoPublish') }}</span>
							</div>
						</div>
					</N8nCard>
				</div>
			</section>

			<section
				ref="workflowSection"
				:class="$style.section"
				tabindex="-1"
				aria-labelledby="playground-workflows"
				:aria-busy="busy"
			>
				<div :class="$style.row">
					<div>
						<h2 id="playground-workflows">
							{{ i18n.baseText('selfHealingPlayground.workflows') }}
							<span :class="$style.count">{{ workflows.length }}</span>
						</h2>
						<p :class="$style.sectionDescription">
							{{ i18n.baseText('selfHealingPlayground.workflows.description') }}
						</p>
					</div>
					<div :class="$style.actions">
						<N8nButton
							variant="destructive"
							size="small"
							:disabled="busy || !workflows.length"
							:loading="activeAction === 'reset'"
							data-test-id="playground-reset"
							@click="perform(prepareReset, 'reset')"
							>{{ i18n.baseText('selfHealingPlayground.reset') }}</N8nButton
						>
						<N8nButton
							:disabled="busy"
							:loading="activeAction === 'refresh'"
							variant="outline"
							size="small"
							@click="perform(refresh, 'refresh')"
						>
							<template #icon><N8nIcon icon="refresh-cw" size="small" /></template
							>{{ i18n.baseText('selfHealingPlayground.refresh') }}
						</N8nButton>
					</div>
				</div>
				<div v-if="!workflows.length" :class="$style.empty">
					<N8nIcon icon="flask-conical" size="large" />
					<h3>
						{{
							i18n.baseText(
								busy ? 'selfHealingPlayground.loading' : 'selfHealingPlayground.emptyTitle',
							)
						}}
					</h3>
					<p v-if="!busy">{{ i18n.baseText('selfHealingPlayground.empty') }}</p>
				</div>
				<N8nCard
					v-for="{ workflow, scenario, latest } in workflowCards"
					:key="workflow.id"
					:class="$style.workflow"
					data-test-id="playground-workflow"
				>
					<div :class="$style.workflowBody">
						<div :class="$style.row">
							<div>
								<h3>{{ workflow.name.slice(PREFIX.length) }}</h3>
								<span :class="$style.meta">{{
									i18n.baseText(
										workflow.isArchived
											? 'selfHealingPlayground.state.archived'
											: published(workflow)
												? 'selfHealingPlayground.state.published'
												: 'selfHealingPlayground.state.draft',
									)
								}}</span>
							</div>
							<div :class="$style.links">
								<RouterLink :to="`/workflow/${workflow.id}`"
									>{{ i18n.baseText('selfHealingPlayground.openWorkflow')
									}}<N8nIcon icon="arrow-up-right" size="small"
								/></RouterLink>
							</div>
						</div>
						<p :class="$style.expectation">
							<strong>{{ i18n.baseText('selfHealingPlayground.expectation') }}</strong>
							{{ scenario?.expectation }}
						</p>
						<N8nCallout v-if="!published(workflow) && !workflow.isArchived" theme="info">{{
							i18n.baseText('selfHealingPlayground.needsPublish')
						}}</N8nCallout>
						<N8nCallout
							v-if="!busy && !canRun(workflow.id) && !workflow.isArchived"
							theme="warning"
							>{{
								i18n.baseText('selfHealingPlayground.workflowConfigurationRequired')
							}}</N8nCallout
						>
						<div :class="$style.actions">
							<N8nButton
								:disabled="
									busy || !published(workflow) || workflow.isArchived || !canRun(workflow.id)
								"
								:loading="activeAction === `run-${workflow.id}`"
								@click="perform(() => sendInput(workflow.id, false), `run-${workflow.id}`)"
							>
								<template #icon><N8nIcon icon="play" size="small" /></template
								>{{ i18n.baseText('selfHealingPlayground.original') }}
							</N8nButton>
							<N8nButton
								variant="outline"
								:disabled="
									busy || !published(workflow) || workflow.isArchived || !canRun(workflow.id)
								"
								:loading="activeAction === `alternate-${workflow.id}`"
								@click="perform(() => sendInput(workflow.id, true), `alternate-${workflow.id}`)"
								>{{ i18n.baseText('selfHealingPlayground.alternate') }}</N8nButton
							>
							<N8nButton
								v-if="!published(workflow) && !workflow.isArchived"
								:disabled="busy"
								@click="perform(() => publish(workflow))"
								>{{ i18n.baseText('selfHealingPlayground.publish') }}</N8nButton
							>
						</div>
						<div v-if="latest" :class="$style.latest">
							<div :class="$style.links">
								<span
									:class="[
										$style.outcome,
										{
											[$style.success]: latest.status === 'success',
											[$style.warning]: latest.status === 'error' || latest.status === 'crashed',
										},
									]"
									>{{ i18n.baseText('selfHealingPlayground.latest') }} ·
									{{
										i18n.baseText(
											`executionsList.${latest.status === 'crashed' ? 'error' : latest.status}`,
										)
									}}</span
								>
								<RouterLink :to="`/workflow/${workflow.id}/executions/${latest.id}`"
									>{{ i18n.baseText('selfHealingPlayground.execution') }} #{{ latest.id
									}}<N8nIcon icon="arrow-up-right" size="small"
								/></RouterLink>
							</div>
							<p v-if="latest.status === 'error' || latest.status === 'crashed'">
								{{ i18n.baseText('selfHealingPlayground.afterFailure') }}
								<RouterLink to="/inbox"
									>{{ i18n.baseText('selfHealingPlayground.inbox') }} →</RouterLink
								>
							</p>
							<p v-else-if="latest.status === 'success'">
								{{ i18n.baseText('selfHealingPlayground.afterSuccess') }}
							</p>
						</div>
						<p v-else :class="$style.meta">
							{{ i18n.baseText('selfHealingPlayground.noExecutions') }}
						</p>
						<details :class="$style.details">
							<summary>{{ i18n.baseText('selfHealingPlayground.inputs') }}</summary>
							<div :class="$style.inputGrid">
								<div>
									<h4>{{ i18n.baseText('selfHealingPlayground.originalInput') }}</h4>
									<pre>{{ JSON.stringify(scenario?.input, null, 2) }}</pre>
								</div>
								<div>
									<h4>{{ i18n.baseText('selfHealingPlayground.alternateInput') }}</h4>
									<pre>{{ JSON.stringify(scenario?.alternateInput, null, 2) }}</pre>
								</div>
							</div>
							<h4>{{ i18n.baseText('selfHealingPlayground.response') }}</h4>
							<pre>{{
								responses[workflow.id] ?? i18n.baseText('selfHealingPlayground.noResponse')
							}}</pre>
							<RouterLink :to="`/workflow/${workflow.id}/executions`">{{
								i18n.baseText('selfHealingPlayground.executions')
							}}</RouterLink>
						</details>
					</div>
				</N8nCard>
			</section>
			<aside :class="$style.troubleshooting">
				<N8nIcon icon="circle-help" />
				<div>
					<h3>{{ i18n.baseText('selfHealingPlayground.troubleshooting.title') }}</h3>
					<p>{{ i18n.baseText('selfHealingPlayground.blocked') }}</p>
				</div>
			</aside>
		</div>
		<N8nDialog
			v-model:open="resetOpen"
			:header="i18n.baseText('selfHealingPlayground.reset.title')"
			size="small"
		>
			<p>
				{{
					i18n.baseText('selfHealingPlayground.reset.description', {
						interpolate: {
							count: workflows.length,
							project:
								availableProjects.find((project) => project.id === projectId)?.name ?? projectId,
						},
					})
				}}
			</p>
			<N8nDialogFooter>
				<N8nButton variant="outline" @click="resetOpen = false">{{
					i18n.baseText('generic.cancel')
				}}</N8nButton>
				<N8nButton
					variant="destructive"
					data-test-id="playground-reset-confirm"
					:disabled="busy"
					@click="perform(resetPlayground, 'reset')"
					>{{ i18n.baseText('selfHealingPlayground.reset.confirm') }}</N8nButton
				>
			</N8nDialogFooter>
		</N8nDialog>
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
.content :is(h1, h2, h3, h4, p) {
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
.content h3 {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}
.content h4 {
	font-size: var(--font-size--sm);
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
.scenarioFooter {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}
.header,
.row {
	justify-content: space-between;
}
.titleGroup {
	flex-wrap: nowrap;
}
.heroIcon {
	display: grid;
	place-items: center;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}
.eyebrow {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	margin-bottom: var(--spacing--4xs) !important;
}
.inboxLink {
	gap: var(--spacing--2xs);
	border: var(--border);
	background: var(--background--surface);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-radius: var(--radius--xs);
	font-weight: var(--font-weight--medium);
}
.intro {
	color: var(--text-color--subtle);
}
.guide {
	list-style: none;
	margin: 0;
	padding: var(--spacing--lg);
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--sm);
	background: var(--background--surface);
}
.guide li {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}
.guide p {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
	margin-top: var(--spacing--4xs);
}
.stepNumber {
	border: var(--border);
	border-radius: var(--radius--full);
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	display: grid;
	place-items: center;
	flex-shrink: 0;
	font-weight: var(--font-weight--bold);
	background: var(--background--subtle);
}
.setup,
.scenario,
.workflow {
	--card--padding: var(--spacing--lg);
	box-shadow: none;
	border-radius: var(--radius--sm);
}
.setupContent {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xl);
}
.setupCopy {
	flex: 1;
}
.setupCopy p {
	color: var(--text-color--subtle);
	margin: var(--spacing--2xs) 0 var(--spacing--sm);
}
.project {
	flex: 0 0 30%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.project label {
	font-weight: var(--font-weight--bold);
}
.project a,
.links {
	font-size: var(--font-size--xs);
}
.links a {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	scroll-margin-top: var(--spacing--lg);
}
.sectionDescription {
	color: var(--text-color--subtle);
	margin-top: var(--spacing--4xs) !important;
}
.scenarios,
.inputGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}
.scenario {
	align-items: stretch;
}
.scenarioBody,
.workflowBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
}
.scenarioBody > p {
	color: var(--text-color--subtle);
	flex: 1;
}
.recommended {
	border-color: var(--border-color--strong);
}
.recommendedLabel {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
.outcome {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--2xs);
	background: var(--background--subtle);
}
.info {
	background: var(--background--info);
	color: var(--text-color--info);
}
.success {
	background: var(--background--success);
	color: var(--text-color--success);
}
.warning {
	background: var(--background--warning);
	color: var(--text-color--warning);
}
.scenarioFooter {
	gap: var(--spacing--xs);
}
.scenarioFooter > span {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
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
.meta {
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}
.expectation {
	color: var(--text-color--subtle);
}
.expectation strong {
	color: var(--text-color);
}
.latest {
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.latest p {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}
.details {
	border-top: var(--border);
	padding-top: var(--spacing--sm);
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
	.guide {
		grid-template-columns: 1fr;
	}
	.scenarios,
	.inputGrid {
		grid-template-columns: 1fr;
	}
	.setupContent {
		flex-direction: column;
		align-items: stretch;
	}
	.project {
		flex-basis: auto;
	}
}
</style>
