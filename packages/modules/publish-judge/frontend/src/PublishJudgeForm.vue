<script setup lang="ts">
import type {
	PublishJudgeEvent,
	PublishJudgeMode,
	PublishJudgeOnUnavailable,
	PublishJudgeType,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import type { JudgeOption } from './publish-judge.api';
import {
	fetchJudgeAgents,
	fetchPublishJudge,
	savePublishJudge,
	searchJudgeWorkflows,
} from './publish-judge.api';

/** `null` edits the instance judge. A project id edits the judge of that project. */
const props = defineProps<{
	projectId: string | null;
	/** The judges project. The pickers offer only what lives there. `null` offers everything. */
	libraryProjectId: string | null;
}>();

/** `removed` tells the parent that the saved choice was "No judge". */
const emit = defineEmits<{ removed: [] }>();

type JudgeChoice = {
	judgeType: PublishJudgeType;
	judgeId: string;
	onUnavailable: PublishJudgeOnUnavailable;
	events: PublishJudgeEvent[];
	mode: PublishJudgeMode;
};

/** The select needs a string value, and a real id is never empty. */
const NO_JUDGE = '';
const emptyChoice = (): JudgeChoice => ({
	judgeType: 'workflow',
	judgeId: NO_JUDGE,
	onUnavailable: 'block',
	events: ['workflowPublish'],
	mode: 'enforce',
});

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const options = ref<Record<PublishJudgeType, JudgeOption[]>>({ workflow: [], agent: [] });
const choice = ref(emptyChoice());
const saved = ref(emptyChoice());
const isLoading = ref(false);
const isSaving = ref(false);

const typeOptions = computed(() => [
	{ label: i18n.baseText('publishJudge.type.workflow'), value: 'workflow' as const },
	{ label: i18n.baseText('publishJudge.type.agent'), value: 'agent' as const },
]);
const EVENTS: PublishJudgeEvent[] = [
	'workflowPublish',
	'workflowSave',
	'agentPublish',
	'agentSave',
];
const sameEvents = (a: PublishJudgeEvent[], b: PublishJudgeEvent[]) =>
	a.length === b.length && a.every((event) => b.includes(event));
const modeOptions = computed(() => [
	{ label: i18n.baseText('publishJudge.mode.enforce'), value: 'enforce' as const },
	{ label: i18n.baseText('publishJudge.mode.dryRun'), value: 'dryRun' as const },
]);
const hasJudge = computed(() => choice.value.judgeId !== NO_JUDGE);
const isDirty = computed(() => {
	const { judgeType, judgeId, onUnavailable, events, mode } = choice.value;
	if (judgeId !== saved.value.judgeId) return true;

	return (
		hasJudge.value &&
		(judgeType !== saved.value.judgeType ||
			onUnavailable !== saved.value.onUnavailable ||
			mode !== saved.value.mode ||
			!sameEvents(events, saved.value.events))
	);
});

/** Keeps the stored judge selectable when the loaded list does not hold it. */
function withOption(list: JudgeOption[], option?: JudgeOption) {
	return option && !list.some(({ id }) => id === option.id) ? [option, ...list] : list;
}

async function searchWorkflows(query: string) {
	try {
		const selected = options.value.workflow.find(({ id }) => id === choice.value.judgeId);
		options.value.workflow = withOption(
			await searchJudgeWorkflows(rootStore.restApiContext, query, props.libraryProjectId),
			selected,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.loadError'));
	}
}

async function load() {
	isLoading.value = true;
	try {
		const [judge, agents] = await Promise.all([
			fetchPublishJudge(rootStore.restApiContext, props.projectId),
			fetchJudgeAgents(rootStore.restApiContext, props.libraryProjectId).catch(() => []),
			searchWorkflows(''),
		]);
		options.value.agent = agents;

		if (judge) {
			const { judgeType, judgeId, judgeName, onUnavailable, events, mode } = judge;
			choice.value = { judgeType, judgeId, onUnavailable, events: [...events], mode };
			options.value[judgeType] = withOption(options.value[judgeType], {
				id: judgeId,
				name: judgeName ?? judgeId,
			});
		} else {
			choice.value = emptyChoice();
		}
		saved.value = { ...choice.value, events: [...choice.value.events] };
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.loadError'));
	} finally {
		isLoading.value = false;
	}
}

function onTypeChange(judgeType: PublishJudgeType) {
	const judgeId = judgeType === saved.value.judgeType ? saved.value.judgeId : NO_JUDGE;
	choice.value = { ...choice.value, judgeType, judgeId };
}

async function save() {
	isSaving.value = true;
	try {
		await savePublishJudge(rootStore.restApiContext, props.projectId, {
			...choice.value,
			judgeId: hasJudge.value ? choice.value.judgeId : null,
		});
		saved.value = { ...choice.value, events: [...choice.value.events] };
		toast.showMessage({ title: i18n.baseText('publishJudge.saved'), type: 'success' });
		if (!hasJudge.value) emit('removed');
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.saveError'));
	} finally {
		isSaving.value = false;
	}
}

onMounted(load);
</script>

<template>
	<div data-test-id="publish-judge-form">
		<N8nSettingsRowGroup>
			<N8nSettingsRow
				:title="i18n.baseText('publishJudge.type.label')"
				:description="i18n.baseText('publishJudge.type.description')"
			>
				<template #action>
					<N8nSegmentControl
						:model-value="choice.judgeType"
						:options="typeOptions"
						:disabled="isLoading"
						data-test-id="publish-judge-type"
						@update:model-value="onTypeChange"
					/>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				:title="i18n.baseText(`publishJudge.judge.${choice.judgeType}.label`)"
				:description="i18n.baseText(`publishJudge.judge.${choice.judgeType}.description`)"
				action-fill
			>
				<template #action>
					<N8nSelect
						size="medium"
						v-if="choice.judgeType === 'workflow'"
						v-model="choice.judgeId"
						:class="$style.control"
						filterable
						remote
						:remote-method="searchWorkflows"
						:disabled="isLoading"
						:aria-label="i18n.baseText('publishJudge.judge.workflow.label')"
						data-test-id="publish-judge-select"
					>
						<N8nOption :value="NO_JUDGE" :label="i18n.baseText('publishJudge.judge.none')" />
						<N8nOption
							v-for="workflow in options.workflow"
							:key="workflow.id"
							:value="workflow.id"
							:label="workflow.name"
						/>
					</N8nSelect>
					<N8nSelect
						size="medium"
						v-else
						v-model="choice.judgeId"
						:class="$style.control"
						filterable
						:disabled="isLoading"
						:aria-label="i18n.baseText('publishJudge.judge.agent.label')"
						data-test-id="publish-judge-select"
					>
						<N8nOption :value="NO_JUDGE" :label="i18n.baseText('publishJudge.judge.none')" />
						<N8nOption
							v-for="agent in options.agent"
							:key="agent.id"
							:value="agent.id"
							:label="agent.name"
						/>
					</N8nSelect>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				:title="i18n.baseText('publishJudge.onUnavailable.label')"
				:description="i18n.baseText('publishJudge.onUnavailable.description')"
				action-fill
			>
				<template #action>
					<N8nSelect
						size="medium"
						v-model="choice.onUnavailable"
						:class="$style.control"
						:disabled="isLoading || !hasJudge"
						:aria-label="i18n.baseText('publishJudge.onUnavailable.label')"
						data-test-id="publish-judge-on-unavailable"
					>
						<N8nOption value="block" :label="i18n.baseText('publishJudge.onUnavailable.block')" />
						<N8nOption value="allow" :label="i18n.baseText('publishJudge.onUnavailable.allow')" />
					</N8nSelect>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				:title="i18n.baseText('publishJudge.events.label')"
				:description="i18n.baseText('publishJudge.events.description')"
				action-fill
			>
				<template #action>
					<N8nSelect
						size="medium"
						v-model="choice.events"
						:class="$style.control"
						multiple
						:disabled="isLoading || !hasJudge"
						:aria-label="i18n.baseText('publishJudge.events.label')"
						data-test-id="publish-judge-events"
					>
						<N8nOption
							v-for="event in EVENTS"
							:key="event"
							:value="event"
							:label="i18n.baseText(`publishJudge.events.${event}`)"
						/>
					</N8nSelect>
				</template>
			</N8nSettingsRow>
			<N8nSettingsRow
				:title="i18n.baseText('publishJudge.mode.label')"
				:description="i18n.baseText('publishJudge.mode.description')"
			>
				<template #action>
					<N8nSegmentControl
						v-model="choice.mode"
						:options="modeOptions"
						:disabled="isLoading || !hasJudge"
						data-test-id="publish-judge-mode"
					/>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
		<div :class="$style.actions">
			<!-- `button`, because the project settings page wraps this form in its own form. -->
			<N8nButton
				native-type="button"
				:label="i18n.baseText('publishJudge.save')"
				:disabled="!isDirty || isLoading"
				:loading="isSaving"
				data-test-id="publish-judge-save"
				@click="save"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.control {
	width: 100%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	margin-top: var(--spacing--md);
}
</style>
