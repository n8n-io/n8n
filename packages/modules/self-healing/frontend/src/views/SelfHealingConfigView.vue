<script setup lang="ts">
import type { SaveSelfHealingConfigurationDto } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	useMessage,
	N8nAlert,
	N8nButton,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';

const props = defineProps<{ projectId: string; configurationId: string }>();
const store = useSelfHealingStore();
const users = useUsersStore();
const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const loadError = ref(false);
const savedForm = ref('');
const form = ref<SaveSelfHealingConfigurationDto>({
	scope: 'all',
	workflowIds: [],
	reviewerIds: [],
	enabled: false,
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

const dirty = computed(() => !!savedForm.value && JSON.stringify(form.value) !== savedForm.value);
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
	i18n.baseText(isNew.value ? 'selfHealing.config.create' : 'selfHealing.config.edit'),
);

async function load() {
	loading.value = true;
	loadError.value = false;
	savedForm.value = '';

	try {
		await store.load(props.projectId);

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
				enabled: false,
			};
		}

		savedForm.value = JSON.stringify(form.value);
	} catch (error) {
		loadError.value = true;
		toast.showError(error, i18n.baseText('selfHealing.config.loadError'));
	} finally {
		loading.value = false;
	}
}

watch(() => [props.projectId, props.configurationId], load, { immediate: true });
watch(
	() => form.value.scope,
	(scope) => {
		if (scope === 'all') {
			form.value.workflowIds = [];
		}
	},
);

function back() {
	void router.push({ path: `/projects/${props.projectId}/settings`, hash: '#self-healing' });
}

async function save() {
	saving.value = true;

	try {
		await store.save(
			props.projectId,
			form.value,
			isNew.value ? undefined : Number(props.configurationId),
		);

		savedForm.value = JSON.stringify(form.value);
		toast.showMessage({ title: i18n.baseText('selfHealing.config.saved'), type: 'success' });
		back();
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
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('selfHealing.config.back')"
		data-test-id="self-healing-config-page"
		@back="back"
	>
		<N8nSettingsPageHeader
			:title="title"
			:description="i18n.baseText('selfHealing.config.description')"
			:show-docs-link="false"
		/>
		<p v-if="loading">{{ i18n.baseText('selfHealing.config.loading') }}</p>
		<N8nButton v-else-if="loadError" variant="outline" @click="load">{{
			i18n.baseText('selfHealing.config.retry')
		}}</N8nButton>
		<form v-else :class="$style.form" @submit.prevent="save">
			<N8nSettingsSection
				:title="i18n.baseText('selfHealing.config.workflows')"
				:description="i18n.baseText('selfHealing.config.scopeHelp')"
			>
				<N8nSettingsRowGroup>
					<N8nSettingsRow layout="custom">
						<N8nSelect
							v-model="form.scope"
							:disabled="saving"
							:aria-label="i18n.baseText('selfHealing.config.scope')"
							data-test-id="self-healing-scope"
						>
							<N8nOption
								value="all"
								:label="i18n.baseText('selfHealing.config.all')"
								:disabled="hasAllWorkflowsConfiguration"
							/>
							<N8nOption value="selected" :label="i18n.baseText('selfHealing.config.selected')" />
						</N8nSelect>
					</N8nSettingsRow>
					<N8nSettingsRow v-if="form.scope === 'selected'" layout="custom">
						<N8nSelect
							v-model="form.workflowIds"
							:disabled="saving"
							multiple
							filterable
							:aria-label="i18n.baseText('selfHealing.config.workflows')"
							:placeholder="i18n.baseText('selfHealing.config.chooseWorkflows')"
							data-test-id="self-healing-workflows"
						>
							<N8nOption
								v-for="workflow in choices?.workflows"
								:key="workflow.id"
								:value="workflow.id"
								:label="workflow.name"
								:disabled="reservedWorkflows.has(workflow.id)"
							/>
						</N8nSelect>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
			<N8nSettingsSection
				:title="i18n.baseText('selfHealing.config.reviewers')"
				:description="i18n.baseText('selfHealing.config.reviewersHelp')"
			>
				<N8nSettingsRowGroup
					><N8nSettingsRow layout="custom">
						<N8nSelect
							v-model="form.reviewerIds"
							:disabled="saving"
							multiple
							filterable
							:aria-label="i18n.baseText('selfHealing.config.reviewers')"
							:placeholder="i18n.baseText('selfHealing.config.chooseReviewers')"
							data-test-id="self-healing-reviewers"
						>
							<N8nOption
								v-for="reviewer in choices?.reviewers"
								:key="reviewer.id"
								:value="reviewer.id"
								:label="
									[reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') ||
									reviewer.email
								"
							/>
						</N8nSelect> </N8nSettingsRow
				></N8nSettingsRowGroup>
			</N8nSettingsSection>
			<N8nSettingsSection :title="i18n.baseText('selfHealing.config.enabled')">
				<N8nSettingsRowGroup
					><N8nSettingsRow
						:title="i18n.baseText('selfHealing.config.enabled')"
						:description="i18n.baseText('selfHealing.config.enabledHelp')"
					>
						<template #action
							><N8nSwitch
								v-model="form.enabled"
								:disabled="saving"
								:aria-label="i18n.baseText('selfHealing.config.enabled')"
								data-test-id="self-healing-enabled"
						/></template> </N8nSettingsRow
				></N8nSettingsRowGroup>
				<N8nAlert type="info" :title="i18n.baseText('selfHealing.config.creditsHelp')" />
				<N8nAlert type="info" :title="i18n.baseText('selfHealing.config.executionsHelp')" />
			</N8nSettingsSection>
			<div :class="$style.actions">
				<N8nButton
					type="submit"
					:loading="saving"
					:disabled="!isFormValid || (!isNew && !dirty)"
					data-test-id="self-healing-save"
					>{{ i18n.baseText('selfHealing.config.save') }}</N8nButton
				>
				<N8nButton type="button" variant="outline" :disabled="saving" @click="back">{{
					i18n.baseText('generic.cancel')
				}}</N8nButton>
			</div>
		</form>
	</N8nSettingsLayout>
</template>

<style module lang="scss">
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
}
.actions {
	display: flex;
	gap: var(--spacing--xs);
}
</style>
