<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nOption,
	N8nSelect,
	N8nStatusDot,
} from '@n8n/design-system';
import type { BadgeVariant, IconName, StatusDotVariant } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
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
const scenarioGroups = [
	{ title: 'selfHealingPlayground.scenarios.single', chains: false },
	{ title: 'selfHealingPlayground.scenarios.chains', chains: true },
] as const;
const steps = ['configure', 'trigger', 'review'] as const;
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
const runs = computed(() => {
	const groups = new Map<
		string,
		{
			key: string;
			scenario: PlaygroundScenario;
			runId: string;
			items: Array<{
				workflow: IWorkflowDb;
				level: number;
				path?: string;
				latest?: IExecutionsListResponse['results'][number];
			}>;
		}
	>();
	for (const workflow of workflows.value) {
		const identity = identifyWorkflow(workflow, scenarios);
		if (!identity) continue;
		const key = `${identity.scenario.id}/${identity.runId}`;
		const group = groups.get(key) ?? {
			key,
			scenario: identity.scenario,
			runId: identity.runId,
			items: [],
		};
		group.items.push({ workflow, ...identity, latest: executions.value[workflow.id]?.[0] });
		groups.set(key, group);
	}
	return [...groups.values()].map((group) => {
		const items = [...group.items].sort((a, b) => a.level - b.level);
		return { ...group, items, parent: items.find(({ path }) => path) };
	});
});
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

function outcome(scenario: PlaygroundScenario): { variant: BadgeVariant; icon: IconName } {
	if (scenario.id === 'healthy') return { variant: 'success', icon: 'circle-check' };
	if (scenario.id === 'unavailable-service') return { variant: 'warning', icon: 'circle-help' };
	return { variant: 'info', icon: 'sparkles' };
}

function levelLabel(scenario: PlaygroundScenario, level: number) {
	if (level) return scenario.chain[level - 1];
	return scenario.chain.length ? i18n.baseText('selfHealingPlayground.level.parent') : '';
}

function executionStatus(status: string): StatusDotVariant {
	if (status === 'success') return 'success';
	return status === 'error' || status === 'crashed' ? 'danger' : 'neutral';
}

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
	const level = (workflow: IWorkflowDb) => identifyWorkflow(workflow, scenarios)?.level ?? 0;
	const targets = [...workflows.value].sort((a, b) => level(a) - level(b));
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

async function createAndPublish(data: WorkflowDataCreate) {
	const workflow = await workflowsStore.createNewWorkflow(data);
	await activateWorkflow(root.restApiContext, workflow.id, { versionId: workflow.versionId });
	return workflow;
}

async function create(scenario: PlaygroundScenario) {
	try {
		const runId = crypto.randomUUID();
		let calleeId: string | undefined;
		for (let level = scenario.chain.length; level >= 0; level--) {
			const data = createWorkflow(scenario, projectId.value, { level, calleeId, runId });
			calleeId = (await createAndPublish(data)).id;
		}
		message.value = i18n.baseText(
			scenario.chain.length
				? 'selfHealingPlayground.createdChain'
				: 'selfHealingPlayground.created',
		);
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
	if (!identity?.path) throw new Error(i18n.baseText('selfHealingPlayground.unknown'));
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
						<p :class="$style.subtle">{{ i18n.baseText('selfHealingPlayground.intro') }}</p>
					</div>
				</div>
				<RouterLink to="/inbox" :class="$style.inboxLink">
					<N8nIcon icon="inbox" />{{ i18n.baseText('selfHealingPlayground.inbox') }}
					<N8nIcon icon="arrow-right" />
				</RouterLink>
			</header>

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

			<N8nCard :class="$style.card">
				<div :class="$style.setup">
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
					</div>
					<div :class="$style.links">
						<RouterLink v-if="projectId" :to="settingsPath">
							<N8nIcon icon="settings" size="small" />{{
								i18n.baseText('selfHealingPlayground.settings')
							}}
						</RouterLink>
						<RouterLink v-if="projectId" :to="`/projects/${projectId}`">{{
							i18n.baseText('selfHealingPlayground.openProject')
						}}</RouterLink>
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
				<ol :class="$style.guide" :aria-label="i18n.baseText('selfHealingPlayground.guide')">
					<li v-for="(step, index) in steps" :key="step">
						<span :class="$style.stepNumber" aria-hidden="true">{{ index + 1 }}</span>
						<div>
							<strong>{{ i18n.baseText(`selfHealingPlayground.guide.${step}.title`) }}</strong>
							<p :class="$style.subtle">
								{{ i18n.baseText(`selfHealingPlayground.guide.${step}.description`) }}
							</p>
						</div>
					</li>
				</ol>
			</N8nCard>
			<N8nCallout v-if="!busy && !availableProjects.length" theme="warning">
				{{ i18n.baseText('selfHealingPlayground.noProjects') }}
			</N8nCallout>
			<N8nCallout
				v-if="!busy && projectId && enabled && configurationState !== 'configured'"
				theme="warning"
				data-test-id="playground-configuration-required"
			>
				{{ configurationMessage }}
				<RouterLink :to="settingsPath">{{
					i18n.baseText('selfHealingPlayground.settings')
				}}</RouterLink>
			</N8nCallout>

			<section :class="$style.section" aria-labelledby="playground-scenarios">
				<div>
					<h2 id="playground-scenarios">
						{{ i18n.baseText('selfHealingPlayground.scenarios.title') }}
					</h2>
					<p :class="$style.subtle">
						{{ i18n.baseText('selfHealingPlayground.scenarios.description') }}
					</p>
				</div>
				<div v-for="group in scenarioGroups" :key="group.title" :class="$style.group">
					<div>
						<h3>{{ i18n.baseText(group.title) }}</h3>
						<p v-if="group.chains" :class="$style.subtle">
							{{ i18n.baseText('selfHealingPlayground.scenarios.chains.description') }}
						</p>
					</div>
					<div :class="$style.grid">
						<N8nCard
							v-for="scenario in scenarios.filter(({ chain }) => !!chain.length === group.chains)"
							:key="scenario.id"
							:class="[$style.card, { [$style.recommended]: scenario.id === 'wrong-field' }]"
						>
							<div :class="$style.scenario">
								<div :class="$style.row">
									<N8nBadge
										:variant="outcome(scenario).variant"
										:leading-icon="outcome(scenario).icon"
										>{{ scenario.outcome }}</N8nBadge
									>
									<span v-if="scenario.id === 'wrong-field'" :class="$style.meta">{{
										i18n.baseText('selfHealingPlayground.recommended')
									}}</span>
								</div>
								<h4>{{ scenario.name }}</h4>
								<p :class="$style.subtle">{{ scenario.description }}</p>
								<ol v-if="scenario.chain.length" :class="$style.chainPreview">
									<li
										v-for="label in [
											i18n.baseText('selfHealingPlayground.level.parent'),
											...scenario.chain,
										]"
										:key="label"
									>
										{{ label }}
									</li>
								</ol>
								<N8nButton
									:class="$style.createButton"
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
							</div>
						</N8nCard>
					</div>
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
						<p :class="$style.subtle">
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
					v-for="{ key, scenario, runId, items, parent } in runs"
					:key="key"
					:class="$style.card"
					data-test-id="playground-run"
				>
					<div :class="$style.run">
						<div :class="$style.row">
							<h3>
								{{ scenario.name }} <span :class="$style.meta">{{ runId }}</span>
							</h3>
							<N8nBadge
								:variant="outcome(scenario).variant"
								:leading-icon="outcome(scenario).icon"
								>{{ scenario.outcome }}</N8nBadge
							>
						</div>
						<p :class="$style.expectation">
							<N8nIcon icon="crosshair" size="small" />
							<strong>{{ i18n.baseText('selfHealingPlayground.expectation') }}</strong>
							{{ scenario.expectation }}
						</p>
						<ol :class="$style.chain">
							<li
								v-for="{ workflow, level, latest } in items"
								:key="workflow.id"
								:class="$style[`level${level}`]"
								data-test-id="playground-workflow"
							>
								<N8nIcon v-if="level" icon="corner-down-right" size="small" />
								<strong v-if="levelLabel(scenario, level)">{{
									levelLabel(scenario, level)
								}}</strong>
								<N8nBadge
									:variant="published(workflow) && !workflow.isArchived ? 'subtle' : 'warning'"
									>{{
										i18n.baseText(
											workflow.isArchived
												? 'selfHealingPlayground.state.archived'
												: published(workflow)
													? 'selfHealingPlayground.state.published'
													: 'selfHealingPlayground.state.draft',
										)
									}}</N8nBadge
								>
								<RouterLink
									v-if="latest"
									:class="$style.status"
									:to="`/workflow/${workflow.id}/executions/${latest.id}`"
								>
									<N8nStatusDot :variant="executionStatus(latest.status)" />{{
										i18n.baseText(
											`executionsList.${latest.status === 'crashed' ? 'error' : latest.status}`,
										)
									}}
									· {{ i18n.baseText('selfHealingPlayground.execution') }} #{{ latest.id }}
								</RouterLink>
								<span v-else :class="$style.meta">{{
									i18n.baseText('selfHealingPlayground.noExecutions')
								}}</span>
								<span :class="$style.rowEnd">
									<N8nButton
										v-if="!published(workflow) && !workflow.isArchived"
										size="small"
										variant="outline"
										:disabled="busy"
										@click="perform(() => publish(workflow))"
										>{{ i18n.baseText('selfHealingPlayground.publish') }}</N8nButton
									>
									<RouterLink :to="`/workflow/${workflow.id}`"
										>{{ i18n.baseText('selfHealingPlayground.openWorkflow')
										}}<N8nIcon icon="arrow-up-right" size="small"
									/></RouterLink>
								</span>
							</li>
						</ol>
						<template v-if="parent">
							<N8nCallout
								v-if="!busy && !canRun(parent.workflow.id) && !parent.workflow.isArchived"
								theme="warning"
								>{{
									i18n.baseText('selfHealingPlayground.workflowConfigurationRequired')
								}}</N8nCallout
							>
							<div :class="$style.actions">
								<N8nButton
									size="small"
									:disabled="
										busy ||
										!published(parent.workflow) ||
										parent.workflow.isArchived ||
										!canRun(parent.workflow.id)
									"
									:loading="activeAction === `run-${parent.workflow.id}`"
									@click="
										perform(() => sendInput(parent.workflow.id, false), `run-${parent.workflow.id}`)
									"
								>
									<template #icon><N8nIcon icon="play" size="small" /></template
									>{{ i18n.baseText('selfHealingPlayground.original') }}
								</N8nButton>
								<N8nButton
									size="small"
									variant="outline"
									:disabled="
										busy ||
										!published(parent.workflow) ||
										parent.workflow.isArchived ||
										!canRun(parent.workflow.id)
									"
									:loading="activeAction === `alternate-${parent.workflow.id}`"
									@click="
										perform(
											() => sendInput(parent.workflow.id, true),
											`alternate-${parent.workflow.id}`,
										)
									"
									>{{ i18n.baseText('selfHealingPlayground.alternate') }}</N8nButton
								>
								<span
									v-if="parent.latest?.status === 'error' || parent.latest?.status === 'crashed'"
									:class="$style.meta"
								>
									{{ i18n.baseText('selfHealingPlayground.afterFailure') }}
									<RouterLink to="/inbox">{{
										i18n.baseText('selfHealingPlayground.inbox')
									}}</RouterLink>
								</span>
								<span v-else-if="parent.latest?.status === 'success'" :class="$style.meta">
									{{ i18n.baseText('selfHealingPlayground.afterSuccess') }}
								</span>
							</div>
							<details :class="$style.details">
								<summary>{{ i18n.baseText('selfHealingPlayground.inputs') }}</summary>
								<div :class="$style.inputGrid">
									<div>
										<h4>{{ i18n.baseText('selfHealingPlayground.originalInput') }}</h4>
										<pre>{{ JSON.stringify(scenario.input, null, 2) }}</pre>
									</div>
									<div>
										<h4>{{ i18n.baseText('selfHealingPlayground.alternateInput') }}</h4>
										<pre>{{ JSON.stringify(scenario.alternateInput, null, 2) }}</pre>
									</div>
								</div>
								<h4>{{ i18n.baseText('selfHealingPlayground.response') }}</h4>
								<pre>{{
									responses[parent.workflow.id] ?? i18n.baseText('selfHealingPlayground.noResponse')
								}}</pre>
								<RouterLink :to="`/workflow/${parent.workflow.id}/executions`">{{
									i18n.baseText('selfHealingPlayground.executions')
								}}</RouterLink>
							</details>
						</template>
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
.content :is(h1, h2, h3, h4, p, ol) {
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
.status,
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
.section,
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	scroll-margin-top: var(--spacing--lg);
}
.section {
	gap: var(--spacing--md);
}
.grid,
.inputGrid {
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
.chainPreview {
	list-style: none;
	padding: 0;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
.chainPreview li:not(:last-child)::after {
	content: '→';
	margin-left: var(--spacing--3xs);
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
.chain {
	list-style: none;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--xs);
}
.chain li {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	font-size: var(--font-size--xs);
}
.chain li + li {
	border-top: var(--border);
}
.chain .level1 {
	padding-left: var(--spacing--lg);
}
.chain .level2 {
	padding-left: var(--spacing--2xl);
}
.content .status {
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
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
	.grid,
	.inputGrid {
		grid-template-columns: 1fr;
	}
	.project {
		flex-basis: 100%;
	}
}
</style>
