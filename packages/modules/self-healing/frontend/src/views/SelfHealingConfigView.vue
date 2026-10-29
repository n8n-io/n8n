<script setup lang="ts">
import type { SaveSelfHealingConfigurationDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nAvatar,
	N8nCombobox2,
	N8nIcon,
	N8nIconButton,
	N8nSegmentControl,
	N8nText,
	N8nUserInfo,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	useMessage,
	type ComboboxItem,
	type ComboboxValue,
	type SegmentOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';

const props = defineProps<{ projectId: string; configurationId: string }>();
const store = useSelfHealingStore();
const users = useUsersStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();

const pageRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref(false);
const savedForm = ref<SaveSelfHealingConfigurationDto>();
const form = ref<SaveSelfHealingConfigurationDto>({
	scope: 'all',
	workflowIds: [],
	reviewerIds: [],
	enabled: true,
});

const isNew = computed(() => props.configurationId === 'new');
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
const selectedWorkflows = computed(() =>
	form.value.workflowIds.map((id) => ({
		id,
		name:
			choices.value?.workflows.find((workflow) => workflow.id === id)?.name ??
			i18n.baseText('selfHealing.config.unavailableWorkflow'),
	})),
);
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

const reviewerPickerItems = computed(() =>
	(choices.value?.reviewers ?? [])
		.filter(({ id }) => !form.value.reviewerIds.includes(id))
		.map((reviewer) => ({
			value: reviewer.id,
			label: reviewerName(reviewer.id),
			keywords: [reviewer.email],
		})),
);

function addWorkflow(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (typeof value === 'string' && value && !form.value.workflowIds.includes(value)) {
		form.value.workflowIds.push(value);
	}
}

function addReviewer(value: ComboboxValue | ComboboxValue[] | undefined) {
	if (typeof value === 'string' && value && !form.value.reviewerIds.includes(value)) {
		form.value.reviewerIds.push(value);
	}
}

onMounted(() => pageRef.value?.scrollIntoView({ block: 'start' }));

const dirty = computed(
	() => !!savedForm.value && JSON.stringify(form.value) !== JSON.stringify(savedForm.value),
);
const isFormValid = computed(() => {
	if (form.value.reviewerIds.length === 0) {
		return false;
	}

	if (form.value.scope === 'all') {
		return !hasAllWorkflowsConfiguration.value;
	}

	return (
		form.value.workflowIds.length > 0 &&
		form.value.workflowIds.every((id) => !reservedWorkflows.value.has(id))
	);
});

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
			throw new Error(i18n.baseText('selfHealing.config.notFound'));
		}

		if (configuration) {
			form.value = {
				scope: configuration.scope,
				workflowIds: [...configuration.workflowIds],
				reviewerIds: [...configuration.reviewerIds],
				enabled: configuration.enabled,
			};
		} else {
			form.value = {
				scope: hasAllWorkflowsConfiguration.value ? 'selected' : 'all',
				workflowIds: [],
				reviewerIds: users.currentUser ? [users.currentUser.id] : [],
				enabled: true,
			};
		}

		savedForm.value = structuredClone(toRaw(form.value));
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
	void router.push({
		name: VIEWS.PROJECT_SETTINGS,
		params: { projectId: props.projectId },
		hash: '#self-healing',
	});
}

async function save() {
	saving.value = true;

	try {
		const payload = structuredClone(toRaw(form.value));
		if (payload.scope === 'all') {
			payload.workflowIds = [];
		}

		const { scope, workflowIds, reviewerIds } = payload;
		await store.save(
			props.projectId,
			isNew.value ? payload : { scope, workflowIds, reviewerIds },
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
				{{ i18n.baseText('selfHealing.config.back') }}
			</N8nButton>
		</div>
		<N8nSettingsLayout :class="$style.layout" data-test-id="self-healing-config-page">
			<N8nSettingsPageHeader
				:title="title"
				:description="i18n.baseText('selfHealing.config.description')"
				:show-docs-link="false"
			/>
			<p v-if="loading">{{ i18n.baseText('selfHealing.config.loading') }}</p>
			<N8nButton v-else-if="loadError" variant="outline" @click="load">{{
				i18n.baseText('selfHealing.config.retry')
			}}</N8nButton>
			<form v-else @submit.prevent="save">
				<N8nSettingsSection :title="i18n.baseText('selfHealing.config.scope')">
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
									:aria-label="i18n.baseText('selfHealing.config.scope')"
									data-test-id="self-healing-scope"
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
							<N8nText
								v-if="!selectedWorkflows.length"
								size="small"
								color="text-light"
								:class="$style.hint"
								>{{ i18n.baseText('selfHealing.config.noWorkflows') }}</N8nText
							>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-for="workflow in selectedWorkflows"
							:key="workflow.id"
							:title="workflow.name"
							show-visual
							data-test-id="self-healing-selected-workflow"
						>
							<template #visual><N8nIcon icon="workflow" size="large" /></template>
							<template #action>
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
					:title="i18n.baseText('selfHealing.config.reviewers')"
					:description="i18n.baseText('selfHealing.config.reviewersHelp')"
				>
					<N8nSettingsRowGroup>
						<N8nSettingsRow layout="custom">
							<N8nCombobox2
								id="self-healing-reviewers"
								model-value=""
								:items="reviewerPickerItems"
								:disabled="saving"
								:aria-label="i18n.baseText('selfHealing.config.reviewers')"
								:placeholder="i18n.baseText('selfHealing.config.chooseReviewers')"
								data-test-id="self-healing-reviewers"
								@update:model-value="addReviewer"
								@keydown.enter.prevent
							>
								<template #item-leading="{ item }">
									<N8nAvatar
										:first-name="reviewersById.get(item.value)?.firstName"
										:last-name="reviewersById.get(item.value)?.lastName"
										size="small"
									/>
								</template>
							</N8nCombobox2>
							<N8nText
								v-if="!form.reviewerIds.length"
								size="small"
								color="text-light"
								:class="$style.hint"
								>{{ i18n.baseText('selfHealing.config.noReviewers') }}</N8nText
							>
						</N8nSettingsRow>
						<N8nSettingsRow
							v-for="reviewer in selectedReviewers"
							:key="reviewer.id"
							data-test-id="self-healing-selected-reviewer"
						>
							<template #info>
								<N8nUserInfo
									v-if="reviewer.user"
									v-bind="reviewer.user"
									:is-current-user="reviewer.id === users.currentUser?.id"
								/>
								<N8nText v-else>{{
									i18n.baseText('selfHealing.config.unavailableReviewer')
								}}</N8nText>
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

.hint {
	display: block;
	margin-top: var(--spacing--2xs);
}
</style>
