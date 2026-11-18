<script setup lang="ts">
import {
	SELF_HEALING_AGENT_SCHEDULE_HOURS,
	SELF_HEALING_AGENT_TRACE_THRESHOLD,
	SELF_HEALING_AGENT_TRIGGER_DEFAULTS,
	isSelfHealingAgentTriggerMissing,
	normalizeSelfHealingAgentGoals,
	type SaveSelfHealingConfigurationDto,
	type SelfHealingAgentGoal,
	type SelfHealingAgentPublicationMode,
	type SelfHealingAgentScope,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nAvatar,
	N8nCallout,
	N8nCombobox2,
	N8nIcon,
	N8nIconButton,
	N8nInputNumber,
	N8nLoading,
	N8nSegmentControl,
	N8nSelect2,
	N8nText,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
	useMessage,
	type ComboboxItem,
	type ComboboxValue,
	type SegmentOption,
	type SelectOptionBase,
	type SelectValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
	PERSONAL_SELF_HEALING_VIEW,
} from '@n8n/frontend-constants/self-healing';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';

import ProjectMembersIcon from '../components/ProjectMembersIcon.vue';
import SubWorkflowPill from '../components/SubWorkflowPill.vue';
import { useSubWorkflowScope, type SubWorkflowCoverage } from '../composables/useSubWorkflowScope';
import { useSelfHealingStore } from '../self-healing.store';

const PROJECT_MEMBERS_OPTION = '__project-members__';
/** What starts an investigation. The stored fields are the hours and the session count. */
type AgentTrigger = 'schedule' | 'sessions' | 'either';
const OPTIONAL_AGENT_GOALS = ['cost', 'latency'] as const;

const props = defineProps<{ projectId: string; configurationId: string }>();
const store = useSelfHealingStore();
const users = useUsersStore();
const settingsStore = useSettingsStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();
const route = useRoute();

const pageRef = ref<HTMLElement | null>(null);
// With the proxy, the Assistant spends n8n credits. Without it, it calls the instance's own AI provider.
const costNote = computed(() =>
	i18n.baseText(
		settingsStore.moduleSettings['instance-ai']?.proxyEnabled
			? 'selfHealing.config.costCredits'
			: 'selfHealing.config.costProvider',
	),
);
const loading = ref(true);
const saving = ref(false);
const loadError = ref(false);
const savedForm = ref<SaveSelfHealingConfigurationDto>();
const form = ref<SaveSelfHealingConfigurationDto>({
	scope: 'all',
	workflowIds: [],
	reviewerIds: [],
	includeAllProjectMembers: false,
	includeSubWorkflows: true,
	agentScope: 'none',
	agentIds: [],
	agentGoals: ['quality'],
	agentScheduleIntervalHours: null,
	agentTraceThreshold: null,
	agentPublicationMode: 'approval',
	enabled: true,
});

const isNew = computed(() => props.configurationId === 'new');
const isPersonalTab = computed(() => route.name === PERSONAL_SELF_HEALING_CONFIGURATION_VIEW);
const choices = computed(() => store.options[props.projectId]);
const otherConfigurations = computed(() =>
	(store.configurations[props.projectId] ?? []).filter(
		({ id }) => String(id) !== props.configurationId,
	),
);
const hasAllWorkflowsConfiguration = computed(() =>
	otherConfigurations.value.some(({ scope }) => scope === 'all'),
);
const reservedWorkflows = computed(
	() => new Set(otherConfigurations.value.flatMap(({ workflowIds }) => workflowIds)),
);

const scopeOptions = computed<Array<SegmentOption<'all' | 'selected'>>>(() => [
	{
		value: 'all',
		label: i18n.baseText('selfHealing.config.allScope'),
		disabled: hasAllWorkflowsConfiguration.value,
	},
	{ value: 'selected', label: i18n.baseText('selfHealing.config.selected') },
]);
const workflowPickerItems = computed<ComboboxItem[]>(() =>
	(choices.value?.workflows ?? [])
		.filter(({ id }) => !form.value.workflowIds.includes(id))
		.map(({ id, name }) => ({
			value: id,
			label: name,
			icon: 'workflow',
			disabled: reservedWorkflows.value.has(id),
		})),
);
const projectWorkflowNames = computed(
	() => new Map(choices.value?.workflows.map(({ id, name }) => [id, name])),
);
const subWorkflowScope = useSubWorkflowScope({
	selectedIds: computed(() => form.value.workflowIds),
	projectWorkflowNames,
	includeSubWorkflows: computed(() => form.value.includeSubWorkflows),
});
const selectedWorkflows = computed(() =>
	form.value.workflowIds.map((id) => ({
		id,
		name:
			projectWorkflowNames.value.get(id) ?? i18n.baseText('selfHealing.config.unavailableWorkflow'),
		coverage: subWorkflowScope.coverage.value.get(id),
	})),
);

function coverageNote(coverage: SubWorkflowCoverage | undefined) {
	if (!coverage) return undefined;
	if (coverage.checking) return i18n.baseText('selfHealing.config.subWorkflows.checking');

	const notes = [];
	if (coverage.uncoveredCount > 0) {
		notes.push(
			i18n.baseText('selfHealing.config.subWorkflows.uncovered', {
				adjustToNumber: coverage.uncoveredCount,
				interpolate: { count: String(coverage.uncoveredCount) },
			}),
		);
	}
	if (coverage.externalCount > 0) {
		notes.push(
			i18n.baseText('selfHealing.config.subWorkflows.externalUncovered', {
				adjustToNumber: coverage.externalCount,
				interpolate: { count: String(coverage.externalCount) },
			}),
		);
	}
	return notes.length > 0 ? notes.join(' ') : undefined;
}

// `options.agents` is empty both when Agents are off and when the project has no agent,
// so the instance setting decides if the section shows.
const agentsEnabled = computed(() => settingsStore.isAgentsEnabled);
const hasAllAgentsConfiguration = computed(() =>
	otherConfigurations.value.some(({ agentScope }) => agentScope === 'all'),
);
const reservedAgents = computed(
	() => new Set(otherConfigurations.value.flatMap(({ agentIds }) => agentIds)),
);
const agentsById = computed(
	() => new Map((choices.value?.agents ?? []).map((agent) => [agent.id, agent])),
);
const agentScopeOptions = computed<Array<SegmentOption<SelfHealingAgentScope>>>(() => [
	{ value: 'none', label: i18n.baseText('selfHealing.config.agents.scope.none') },
	{
		value: 'all',
		label: i18n.baseText('selfHealing.config.agents.scope.all'),
		disabled: hasAllAgentsConfiguration.value,
	},
	{ value: 'selected', label: i18n.baseText('selfHealing.config.selected') },
]);
const agentTriggerOptions = computed<Array<SelectOptionBase<AgentTrigger>>>(() => [
	{ value: 'schedule', label: i18n.baseText('selfHealing.config.agents.trigger.schedule') },
	{ value: 'sessions', label: i18n.baseText('selfHealing.config.agents.trigger.sessions') },
	{ value: 'either', label: i18n.baseText('selfHealing.config.agents.trigger.either') },
]);
const agentPublicationOptions = computed<Array<SegmentOption<SelfHealingAgentPublicationMode>>>(
	() => [
		{ value: 'approval', label: i18n.baseText('selfHealing.config.agents.publication.approval') },
		{ value: 'auto', label: i18n.baseText('selfHealing.config.agents.publication.auto') },
	],
);

const agentPickerItems = computed<ComboboxItem[]>(() =>
	(choices.value?.agents ?? [])
		.filter(({ id }) => !form.value.agentIds.includes(id))
		.map(({ id, name, published }) => ({
			value: id,
			label: name,
			icon: 'robot',
			disabled: !published || reservedAgents.value.has(id),
		})),
);
const selectedAgents = computed(() =>
	form.value.agentIds.map((id) => {
		const agent = agentsById.value.get(id);
		return {
			id,
			name: agent?.name ?? i18n.baseText('selfHealing.config.agents.unavailable'),
			published: agent?.published ?? false,
			note:
				agent && !agent.published
					? i18n.baseText('selfHealing.config.agents.notPublishedHelp')
					: undefined,
		};
	}),
);

function addAgent(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (typeof value === 'string' && value && !form.value.agentIds.includes(value)) {
		form.value.agentIds.push(value);
	}
}

function setTriggerValue(
	field: 'agentScheduleIntervalHours' | 'agentTraceThreshold',
	value: number | null | undefined,
) {
	// The number input emits no number while its text is empty. Keep the last value then.
	if (typeof value === 'number' && Number.isFinite(value)) {
		form.value[field] = Math.round(value);
	}
}

const agentTrigger = computed<AgentTrigger>(() => {
	if (form.value.agentScheduleIntervalHours === null) return 'sessions';
	return form.value.agentTraceThreshold === null ? 'schedule' : 'either';
});

/** Turn on the fields of the choice. A field that stays on keeps its value. */
function setAgentTrigger(trigger: AgentTrigger) {
	const { scheduleIntervalHours, traceThreshold } = SELF_HEALING_AGENT_TRIGGER_DEFAULTS;
	form.value.agentScheduleIntervalHours =
		trigger === 'sessions'
			? null
			: (form.value.agentScheduleIntervalHours ?? scheduleIntervalHours);
	form.value.agentTraceThreshold =
		trigger === 'schedule' ? null : (form.value.agentTraceThreshold ?? traceThreshold);
}

function isAgentTrigger(value: SelectValue | undefined): value is AgentTrigger {
	return value === 'schedule' || value === 'sessions' || value === 'either';
}

function onAgentTriggerSelect(value: SelectValue | undefined) {
	if (isAgentTrigger(value)) setAgentTrigger(value);
}

function setAgentScope(scope: SelfHealingAgentScope) {
	form.value.agentScope = scope;
	// Agent coverage needs a trigger.
	if (isSelfHealingAgentTriggerMissing(form.value)) setAgentTrigger('either');
}

function setAgentGoal(goal: SelfHealingAgentGoal, selected: boolean) {
	const others = form.value.agentGoals.filter((value) => value !== goal);
	form.value.agentGoals = normalizeSelfHealingAgentGoals(selected ? [...others, goal] : others);
}

const reviewersById = computed(
	() => new Map(choices.value?.reviewers.map((reviewer) => [reviewer.id, reviewer])),
);

function reviewerName(id: string) {
	const reviewer = reviewersById.value.get(id);
	if (!reviewer) return i18n.baseText('selfHealing.config.unavailableReviewer');

	const name = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || reviewer.email;
	if (id === users.currentUser?.id) {
		return i18n.baseText('selfHealing.config.you', { interpolate: { name } });
	}

	return name;
}

const selectedReviewers = computed(() =>
	form.value.reviewerIds.map((id) => ({
		id,
		user: reviewersById.value.get(id),
	})),
);

const projectMembersLabel = computed(() =>
	i18n.baseText('selfHealing.config.projectMembers', {
		interpolate: { project: choices.value?.project.name ?? '' },
	}),
);

const reviewerPickerItems = computed<ComboboxItem[]>(() => [
	{ value: PROJECT_MEMBERS_OPTION, label: projectMembersLabel.value },
	...(choices.value?.reviewers ?? [])
		.filter(({ id }) => !form.value.reviewerIds.includes(id))
		.map((reviewer) => ({
			value: reviewer.id,
			label: reviewerName(reviewer.id),
			keywords: [reviewer.email],
		}))
		.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
]);

function addWorkflow(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (typeof value === 'string' && value && !form.value.workflowIds.includes(value)) {
		form.value.workflowIds.push(value);
		void subWorkflowScope.load([value]);
	}
}

function addReviewer(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (value === PROJECT_MEMBERS_OPTION) {
		form.value.includeAllProjectMembers = true;
	} else if (typeof value === 'string' && value && !form.value.reviewerIds.includes(value)) {
		form.value.reviewerIds.push(value);
	}
}

onMounted(() => pageRef.value?.scrollIntoView({ block: 'start' }));

const dirty = computed(
	() => !!savedForm.value && JSON.stringify(form.value) !== JSON.stringify(savedForm.value),
);
const hasReviewers = computed(
	() => form.value.includeAllProjectMembers || form.value.reviewerIds.length > 0,
);
const agentsValid = computed(() => {
	if (form.value.agentScope === 'none') return true;
	if (isSelfHealingAgentTriggerMissing(form.value)) return false;
	if (form.value.agentScope === 'all') return !hasAllAgentsConfiguration.value;

	return (
		form.value.agentIds.length > 0 &&
		form.value.agentIds.every((id) => !reservedAgents.value.has(id))
	);
});
const workflowsValid = computed(() => {
	if (form.value.scope === 'all') {
		return !hasAllWorkflowsConfiguration.value;
	}

	// A configuration that covers agents can cover no workflow.
	if (form.value.workflowIds.length === 0) {
		return form.value.agentScope !== 'none';
	}

	return form.value.workflowIds.every((id) => !reservedWorkflows.value.has(id));
});
const isFormValid = computed(() => hasReviewers.value && agentsValid.value && workflowsValid.value);

const title = computed(() =>
	i18n.baseText(isNew.value ? 'selfHealing.config.new' : 'selfHealing.config.edit'),
);

let pendingLoad: symbol | undefined;

async function load() {
	const request = Symbol();
	pendingLoad = request;
	loading.value = true;
	loadError.value = false;
	savedForm.value = undefined;

	try {
		await store.load(props.projectId);
		if (pendingLoad !== request) return;

		const configuration = store.configurations[props.projectId]?.find(
			({ id }) => String(id) === props.configurationId,
		);
		if (!isNew.value && !configuration) {
			throw new Error(
				i18n.baseText(
					isPersonalTab.value
						? 'selfHealing.config.personalNotFound'
						: 'selfHealing.config.notFound',
				),
			);
		}

		if (configuration) {
			form.value = {
				scope: configuration.scope,
				workflowIds: [...configuration.workflowIds],
				reviewerIds: [...configuration.reviewerIds],
				includeAllProjectMembers: configuration.includeAllProjectMembers,
				includeSubWorkflows: configuration.includeSubWorkflows,
				agentScope: configuration.agentScope,
				agentIds: [...configuration.agentIds],
				agentGoals: [...configuration.agentGoals],
				agentScheduleIntervalHours: configuration.agentScheduleIntervalHours,
				agentTraceThreshold: configuration.agentTraceThreshold,
				agentPublicationMode: configuration.agentPublicationMode,
				enabled: configuration.enabled,
			};
		} else {
			const currentUserId = users.currentUser?.id;
			form.value = {
				scope: hasAllWorkflowsConfiguration.value ? 'selected' : 'all',
				workflowIds: [],
				reviewerIds: currentUserId && reviewersById.value.has(currentUserId) ? [currentUserId] : [],
				includeAllProjectMembers: false,
				includeSubWorkflows: true,
				agentScope: 'none',
				agentIds: [],
				agentGoals: ['quality'],
				agentScheduleIntervalHours: null,
				agentTraceThreshold: null,
				agentPublicationMode: 'approval',
				enabled: true,
			};
		}

		if (isPersonalTab.value) {
			form.value.reviewerIds = [];
			form.value.includeAllProjectMembers = true;
		}

		savedForm.value = structuredClone(toRaw(form.value));
		// A configuration from before the trigger rule has no trigger. The user must save one.
		if (isSelfHealingAgentTriggerMissing(form.value)) setAgentTrigger('either');
		void subWorkflowScope.load(form.value.workflowIds, { refresh: true });
	} catch (error) {
		if (pendingLoad !== request) return;

		loadError.value = true;
		toast.showError(error, i18n.baseText('selfHealing.config.loadError'));
	} finally {
		if (pendingLoad === request) {
			loading.value = false;
		}
	}
}

watch(() => [props.projectId, props.configurationId], load, { immediate: true });

function discard() {
	if (savedForm.value) {
		form.value = structuredClone(toRaw(savedForm.value));
	}
}

function back() {
	void router.push(
		isPersonalTab.value
			? { name: PERSONAL_SELF_HEALING_VIEW, params: { projectId: props.projectId } }
			: {
					name: VIEWS.PROJECT_SETTINGS,
					params: { projectId: props.projectId },
					hash: '#self-healing',
				},
	);
}

async function save() {
	saving.value = true;

	try {
		const payload = structuredClone(toRaw(form.value));
		if (payload.scope === 'all') {
			payload.workflowIds = [];
		}
		if (payload.agentScope !== 'selected') {
			payload.agentIds = [];
		}

		const { enabled, ...edit } = payload;
		await store.save(
			props.projectId,
			isNew.value ? payload : edit,
			isNew.value ? undefined : Number(props.configurationId),
		);

		form.value = payload;
		savedForm.value = structuredClone(payload);
		toast.showMessage({ title: i18n.baseText('selfHealing.config.saved'), type: 'success' });

		if (isNew.value) back();
	} catch (error) {
		toast.showError(error, i18n.baseText('selfHealing.config.saveError'));
	} finally {
		saving.value = false;
	}
}

async function confirmDiscardChanges() {
	if (!dirty.value) {
		return true;
	}

	const answer = await message.confirm(
		i18n.baseText('selfHealing.config.unsavedMessage'),
		i18n.baseText('selfHealing.config.unsavedTitle'),
		{
			confirmButtonText: i18n.baseText('selfHealing.config.discard'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);

	return answer === 'confirm';
}

onBeforeRouteLeave(confirmDiscardChanges);
onBeforeRouteUpdate(async (to, from) => {
	if (
		to.params.projectId !== from.params.projectId ||
		to.params.configurationId !== from.params.configurationId
	) {
		return await confirmDiscardChanges();
	}

	return true;
});
</script>

<template>
	<div ref="pageRef" :class="$style.page">
		<div :class="$style.backBar">
			<N8nButton variant="ghost" size="small" :class="$style.backButton" @click="back">
				<template #icon><N8nIcon icon="arrow-left" /></template>
				{{
					i18n.baseText(isPersonalTab ? 'selfHealing.config.heading' : 'selfHealing.config.back')
				}}
			</N8nButton>
		</div>
		<N8nSettingsLayout :class="$style.layout" data-test-id="self-healing-config-page">
			<N8nSettingsPageHeader :title="title" :show-docs-link="false">
				<template #description>
					<N8nText size="medium" color="text-base">{{
						i18n.baseText(
							isPersonalTab
								? 'selfHealing.config.personalDescription'
								: 'selfHealing.config.description',
						)
					}}</N8nText>
					<N8nText
						size="medium"
						color="text-base"
						:class="$style.costNote"
						data-test-id="self-healing-cost-note"
						>{{ costNote }}</N8nText
					>
				</template>
			</N8nSettingsPageHeader>
			<div v-if="loading" data-test-id="self-healing-config-loading">
				<N8nSettingsSection :title="i18n.baseText('selfHealing.config.workflows')">
					<N8nSettingsRowGroup>
						<N8nSettingsRow>
							<template #info>
								<N8nLoading :rows="2" :class="$style.skeleton" />
							</template>
							<template #action>
								<N8nLoading variant="button" />
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSection
					v-if="!isPersonalTab"
					:title="i18n.baseText('selfHealing.config.reviewers')"
					:description="i18n.baseText('selfHealing.config.reviewersHelp')"
				>
					<N8nSettingsRowGroup>
						<N8nSettingsRow layout="custom">
							<N8nLoading :class="$style.skeleton" />
						</N8nSettingsRow>
						<N8nSettingsRow>
							<template #info>
								<N8nLoading :rows="2" :class="$style.skeleton" />
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</div>
			<N8nButton v-else-if="loadError" variant="outline" @click="load">{{
				i18n.baseText('selfHealing.config.retry')
			}}</N8nButton>
			<form v-else @submit.prevent="save">
				<N8nSettingsSection :title="i18n.baseText('selfHealing.config.workflows')">
					<N8nSettingsRowGroup>
						<N8nSettingsRow
							:title="i18n.baseText('selfHealing.config.workflows')"
							:description="i18n.baseText('selfHealing.config.scopeHelp')"
						>
							<template #action>
								<N8nSegmentControl
									v-model="form.scope"
									:options="scopeOptions"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.workflows')"
									data-test-id="self-healing-scope"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							:title="i18n.baseText('selfHealing.config.subWorkflows.toggle')"
							:description="i18n.baseText('selfHealing.config.subWorkflows.description')"
						>
							<template #action>
								<N8nSwitch
									v-model="form.includeSubWorkflows"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.subWorkflows.toggle')"
									data-test-id="self-healing-include-sub-workflows"
								/>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup v-if="form.scope === 'selected'">
						<N8nSettingsRow layout="custom">
							<N8nCombobox2
								id="self-healing-workflows"
								model-value=""
								icon="search"
								:class="$style.searchPicker"
								:items="workflowPickerItems"
								:disabled="saving"
								:aria-label="i18n.baseText('selfHealing.config.workflows')"
								:placeholder="i18n.baseText('selfHealing.config.chooseWorkflows')"
								data-test-id="self-healing-workflows"
								@update:model-value="addWorkflow"
								@keydown.enter.prevent
							>
								<template #item-trailing="{ item }">
									<N8nText v-if="item.disabled" size="small" color="text-light">{{
										i18n.baseText('selfHealing.config.workflowReserved')
									}}</N8nText>
								</template>
							</N8nCombobox2>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-for="workflow in selectedWorkflows"
							:key="workflow.id"
							:title="workflow.name"
							:description="coverageNote(workflow.coverage)"
							show-visual
							data-test-id="self-healing-selected-workflow"
						>
							<template #visual><N8nIcon icon="workflow" size="large" /></template>
							<template #action>
								<SubWorkflowPill
									v-if="workflow.coverage?.subWorkflows.length"
									:sub-workflows="workflow.coverage.subWorkflows"
								/>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.removeWorkflow')"
									@click="form.workflowIds = form.workflowIds.filter((id) => id !== workflow.id)"
								/>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSection
					v-if="agentsEnabled"
					:title="i18n.baseText('selfHealing.config.agents.title')"
					:description="i18n.baseText('selfHealing.config.agents.help')"
					data-test-id="self-healing-agents-section"
				>
					<N8nSettingsRowGroup>
						<N8nSettingsRow
							:title="i18n.baseText('selfHealing.config.agents.title')"
							:description="i18n.baseText('selfHealing.config.agents.scopeHelp')"
						>
							<template #action>
								<N8nSegmentControl
									:model-value="form.agentScope"
									:options="agentScopeOptions"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.agents.title')"
									data-test-id="self-healing-agent-scope"
									@update:model-value="setAgentScope"
								/>
							</template>
						</N8nSettingsRow>
						<template v-if="form.agentScope !== 'none'">
							<N8nSettingsRow
								v-for="goal in OPTIONAL_AGENT_GOALS"
								:key="goal"
								:title="i18n.baseText(`selfHealing.config.agents.goal.${goal}`)"
								:description="i18n.baseText(`selfHealing.config.agents.goal.${goal}Help`)"
							>
								<template #action>
									<N8nSwitch
										:model-value="form.agentGoals.includes(goal)"
										:disabled="saving"
										:aria-label="i18n.baseText(`selfHealing.config.agents.goal.${goal}`)"
										:data-test-id="`self-healing-agent-goal-${goal}`"
										@update:model-value="setAgentGoal(goal, $event === true)"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow
								:title="i18n.baseText('selfHealing.config.agents.trigger.title')"
								:description="
									i18n.baseText(`selfHealing.config.agents.trigger.help.${agentTrigger}`)
								"
								data-test-id="self-healing-agent-trigger-row"
							>
								<template #action>
									<N8nSelect2
										:model-value="agentTrigger"
										:items="agentTriggerOptions"
										size="medium"
										align="end"
										:disabled="saving"
										:class="$style.triggerSelect"
										:aria-label="i18n.baseText('selfHealing.config.agents.trigger.title')"
										data-test-id="self-healing-agent-trigger"
										@update:model-value="onAgentTriggerSelect"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow
								v-if="form.agentScheduleIntervalHours !== null"
								:title="i18n.baseText('selfHealing.config.agents.schedule.hours')"
							>
								<template #action>
									<N8nInputNumber
										:model-value="form.agentScheduleIntervalHours"
										:min="SELF_HEALING_AGENT_SCHEDULE_HOURS.min"
										:max="SELF_HEALING_AGENT_SCHEDULE_HOURS.max"
										:precision="0"
										:disabled="saving"
										:class="$style.triggerInput"
										:aria-label="i18n.baseText('selfHealing.config.agents.schedule.hours')"
										data-test-id="self-healing-agent-schedule-hours"
										@update:model-value="setTriggerValue('agentScheduleIntervalHours', $event)"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow
								v-if="form.agentTraceThreshold !== null"
								:title="i18n.baseText('selfHealing.config.agents.traces.count')"
							>
								<template #action>
									<N8nInputNumber
										:model-value="form.agentTraceThreshold"
										:min="SELF_HEALING_AGENT_TRACE_THRESHOLD.min"
										:max="SELF_HEALING_AGENT_TRACE_THRESHOLD.max"
										:precision="0"
										:disabled="saving"
										:class="$style.triggerInput"
										:aria-label="i18n.baseText('selfHealing.config.agents.traces.count')"
										data-test-id="self-healing-agent-trace-threshold"
										@update:model-value="setTriggerValue('agentTraceThreshold', $event)"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow
								:title="i18n.baseText('selfHealing.config.agents.publication.title')"
								:description="i18n.baseText('selfHealing.config.agents.publication.help')"
							>
								<template #action>
									<N8nSegmentControl
										v-model="form.agentPublicationMode"
										:options="agentPublicationOptions"
										:disabled="saving"
										:aria-label="i18n.baseText('selfHealing.config.agents.publication.title')"
										data-test-id="self-healing-agent-publication"
									/>
								</template>
							</N8nSettingsRow>
							<N8nSettingsRow v-if="form.agentPublicationMode === 'auto'" layout="custom">
								<N8nCallout theme="warning" data-test-id="self-healing-agent-publication-warning">{{
									i18n.baseText('selfHealing.config.agents.publication.autoWarning')
								}}</N8nCallout>
							</N8nSettingsRow>
						</template>
					</N8nSettingsRowGroup>
					<N8nSettingsRowGroup v-if="form.agentScope === 'selected'">
						<N8nSettingsRow layout="custom">
							<N8nCombobox2
								id="self-healing-agents"
								model-value=""
								icon="search"
								:class="$style.searchPicker"
								:items="agentPickerItems"
								:disabled="saving"
								:aria-label="i18n.baseText('selfHealing.config.agents.title')"
								:placeholder="i18n.baseText('selfHealing.config.agents.choose')"
								data-test-id="self-healing-agents"
								@update:model-value="addAgent"
								@keydown.enter.prevent
							>
								<template #item-trailing="{ item }">
									<N8nText v-if="item.disabled" size="small" color="text-light">{{
										i18n.baseText(
											reservedAgents.has(item.value)
												? 'selfHealing.config.workflowReserved'
												: 'selfHealing.config.agents.notPublished',
										)
									}}</N8nText>
								</template>
							</N8nCombobox2>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-for="agent in selectedAgents"
							:key="agent.id"
							:title="agent.name"
							:description="agent.note"
							show-visual
							data-test-id="self-healing-selected-agent"
						>
							<template #visual><N8nIcon icon="robot" size="large" /></template>
							<template #action>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.agents.remove')"
									@click="form.agentIds = form.agentIds.filter((id) => id !== agent.id)"
								/>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<N8nSettingsSection
					v-if="!isPersonalTab"
					:title="i18n.baseText('selfHealing.config.reviewers')"
					:description="i18n.baseText('selfHealing.config.reviewersHelp')"
				>
					<N8nSettingsRowGroup>
						<N8nSettingsRow layout="custom">
							<N8nCombobox2
								id="self-healing-reviewers"
								model-value=""
								:items="reviewerPickerItems"
								:disabled="saving || form.includeAllProjectMembers"
								:aria-label="i18n.baseText('selfHealing.config.reviewers')"
								:placeholder="i18n.baseText('selfHealing.config.chooseReviewers')"
								data-test-id="self-healing-reviewers"
								@update:model-value="addReviewer"
								@keydown.enter.prevent
							>
								<template #item-leading="{ item }">
									<ProjectMembersIcon
										v-if="item.value === PROJECT_MEMBERS_OPTION"
										:icon="choices?.project.icon"
									/>
									<N8nAvatar
										v-else
										:first-name="reviewersById.get(item.value)?.firstName"
										:last-name="reviewersById.get(item.value)?.lastName"
										size="small"
									/>
								</template>
							</N8nCombobox2>
							<N8nText v-if="!hasReviewers" size="small" color="text-light" :class="$style.hint">{{
								i18n.baseText('selfHealing.config.noReviewers')
							}}</N8nText>
							<N8nText
								v-else-if="form.includeAllProjectMembers"
								size="small"
								color="text-light"
								:class="$style.hint"
								>{{ i18n.baseText('selfHealing.config.projectMembersIncluded') }}</N8nText
							>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-if="form.includeAllProjectMembers"
							data-test-id="self-healing-project-members"
						>
							<template #info>
								<div :class="$style.projectMembers">
									<ProjectMembersIcon :icon="choices?.project.icon" size="medium" />
									<N8nText bold color="text-dark" :class="$style.truncate">{{
										projectMembersLabel
									}}</N8nText>
								</div>
							</template>
							<template #action>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.removeProjectMembers')"
									@click="form.includeAllProjectMembers = false"
								/>
							</template>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-for="reviewer in selectedReviewers"
							:key="reviewer.id"
							data-test-id="self-healing-selected-reviewer"
						>
							<template #info>
								<div :class="$style.person">
									<N8nAvatar
										:first-name="reviewer.user?.firstName"
										:last-name="reviewer.user?.lastName"
										size="small"
									/>
									<div :class="$style.personText">
										<N8nText bold size="medium" color="text-dark" :class="$style.truncate">{{
											reviewerName(reviewer.id)
										}}</N8nText>
										<N8nText
											v-if="
												reviewer.user?.email && (reviewer.user.firstName || reviewer.user.lastName)
											"
											size="small"
											color="text-light"
											:class="$style.truncate"
											>{{ reviewer.user.email }}</N8nText
										>
									</div>
								</div>
							</template>
							<template #action>
								<N8nIconButton
									icon="x"
									variant="ghost"
									size="small"
									:disabled="saving"
									:aria-label="i18n.baseText('selfHealing.config.removeReviewer')"
									@click="form.reviewerIds = form.reviewerIds.filter((id) => id !== reviewer.id)"
								/>
							</template>
						</N8nSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
				<div :class="$style.actions">
					<N8nButton
						type="button"
						variant="outline"
						:disabled="saving || (!isNew && !dirty)"
						@click="isNew ? back() : discard()"
						>{{ i18n.baseText(isNew ? 'generic.cancel' : 'selfHealing.config.discard') }}</N8nButton
					>
					<N8nButton
						type="submit"
						:loading="saving"
						:disabled="!isFormValid || (!isNew && !dirty)"
						data-test-id="self-healing-save"
						>{{
							i18n.baseText(isNew ? 'selfHealing.config.createAction' : 'selfHealing.config.save')
						}}</N8nButton
					>
				</div>
			</form>
		</N8nSettingsLayout>
	</div>
</template>

<style module lang="scss">
.costNote {
	display: block;
	margin-top: var(--spacing--2xs);
}

.page {
	width: 100%;
}

.backBar {
	position: sticky;
	top: 0;
	z-index: 1;
	padding: var(--spacing--2xs) var(--spacing--lg) var(--spacing--sm);
	background-color: var(--color--background--light-2);
}

.backButton {
	margin-inline-start: calc(-1 * var(--spacing--xs));
}

.layout {
	padding-top: var(--spacing--2xs);
}

.actions {
	margin-top: var(--spacing--lg);
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.searchPicker [data-icon='search'] {
	color: var(--input--placeholder--color);
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.personText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.projectMembers {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
}

.triggerSelect {
	width: calc(var(--spacing--4xl) * 1.5);
}

.triggerInput {
	width: var(--spacing--4xl);
}

.skeleton {
	:global(.el-skeleton__p) {
		margin-top: 0;
	}
}
</style>
