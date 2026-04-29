<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import {
	N8nHeading,
	N8nNotice,
	N8nSelect,
	N8nOption,
	N8nText,
	N8nInputLabel,
	N8nLoading,
} from '@n8n/design-system';

import { useNodeGovernanceStore } from '../nodeGovernance.store';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();
const projectsStore = useProjectsStore();

const { governanceSettings } = storeToRefs(nodeGovernanceStore);

const settingsLoading = ref(true);
const saving = ref(false);

const teamProjects = ref<Array<{ id: string; name: string }>>([]);
const projectOverrides = ref<
	Array<{ projectId: string; projectName: string; defaultBehavior: 'allow' | 'block' }>
>([]);

onBeforeMount(async () => {
	try {
		const [settings] = await Promise.all([
			nodeGovernanceStore.fetchGovernanceSettings(),
			projectsStore.getAllProjects(),
		]);
		teamProjects.value = (projectsStore.teamProjects ?? []).map((p) => ({
			id: p.id,
			name: p.name,
		}));
		projectOverrides.value = settings.projectOverrides;
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.settings.update.error'));
	} finally {
		settingsLoading.value = false;
	}
});

async function onGlobalDefaultChange(value: 'allow' | 'block') {
	saving.value = true;
	try {
		const updated = await nodeGovernanceStore.updateGlobalDefaultBehavior(value);
		projectOverrides.value = updated.projectOverrides;
		showMessage({
			title: i18n.baseText('nodeGovernance.settings.update.success'),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.settings.update.error'));
	} finally {
		saving.value = false;
	}
}

async function onProjectOverrideChange(projectId: string, value: 'allow' | 'block' | 'inherit') {
	saving.value = true;
	try {
		const effectiveValue = value === 'inherit' ? null : value;
		await nodeGovernanceStore.updateProjectDefaultBehavior(projectId, effectiveValue);
		if (effectiveValue === null) {
			projectOverrides.value = projectOverrides.value.filter((o) => o.projectId !== projectId);
		} else {
			const existing = projectOverrides.value.find((o) => o.projectId === projectId);
			if (existing) {
				existing.defaultBehavior = effectiveValue;
			} else {
				const project = teamProjects.value.find((p) => p.id === projectId);
				projectOverrides.value.push({
					projectId,
					projectName: project?.name ?? projectId,
					defaultBehavior: effectiveValue,
				});
			}
		}
		showMessage({
			title: i18n.baseText('nodeGovernance.settings.update.success'),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.settings.update.error'));
	} finally {
		saving.value = false;
	}
}

function getProjectOverrideValue(projectId: string): 'allow' | 'block' | 'inherit' {
	const override = projectOverrides.value.find((o) => o.projectId === projectId);
	return override?.defaultBehavior ?? 'inherit';
}
</script>

<template>
	<div>
		<N8nLoading v-if="settingsLoading" :rows="4" variant="p" />

		<template v-else>
			<div :class="$style.section">
				<N8nHeading tag="h3" size="small" class="mb-2xs">
					{{ i18n.baseText('nodeGovernance.settings.title') }}
				</N8nHeading>
				<N8nText color="text-light" size="small" class="mb-m">
					{{ i18n.baseText('nodeGovernance.settings.description') }}
				</N8nText>

				<div :class="$style.settingRow">
					<N8nInputLabel
						:label="i18n.baseText('nodeGovernance.settings.globalDefault')"
						:tooltip-text="i18n.baseText('nodeGovernance.settings.globalDefault.description')"
					>
						<N8nSelect
							:model-value="governanceSettings?.globalDefault ?? 'allow'"
							data-test-id="global-default-select"
							:disabled="saving"
							@update:model-value="onGlobalDefaultChange"
						>
							<N8nOption value="allow" :label="i18n.baseText('nodeGovernance.settings.allow')" />
							<N8nOption value="block" :label="i18n.baseText('nodeGovernance.settings.block')" />
						</N8nSelect>
					</N8nInputLabel>
				</div>
			</div>

			<div
				v-if="governanceSettings?.globalDefault === 'block' && teamProjects.length > 0"
				:class="$style.section"
			>
				<N8nHeading tag="h3" size="small" class="mb-2xs">
					{{ i18n.baseText('nodeGovernance.settings.projectOverride') }}
				</N8nHeading>
				<N8nText color="text-light" size="small" class="mb-m">
					{{ i18n.baseText('nodeGovernance.settings.projectOverride.description') }}
				</N8nText>

				<div v-for="project in teamProjects" :key="project.id" :class="$style.projectRow">
					<N8nText :class="$style.projectName" :bold="true">{{
						project.name || project.id
					}}</N8nText>
					<N8nSelect
						:model-value="getProjectOverrideValue(project.id)"
						:disabled="saving"
						:data-test-id="`project-override-${project.id}`"
						@update:model-value="
							(v: string) => onProjectOverrideChange(project.id, v as 'allow' | 'block' | 'inherit')
						"
					>
						<N8nOption
							value="inherit"
							:label="i18n.baseText('nodeGovernance.settings.projectOverride.inherit')"
						/>
						<N8nOption value="allow" :label="i18n.baseText('nodeGovernance.settings.allow')" />
						<N8nOption value="block" :label="i18n.baseText('nodeGovernance.settings.block')" />
					</N8nSelect>
				</div>
			</div>

			<N8nNotice v-if="governanceSettings?.globalDefault === 'block'" type="warning" class="mt-m">
				All nodes without an explicit allow policy will be blocked by default. Make sure your allow
				policies cover all nodes that users need.
			</N8nNotice>
		</template>
	</div>
</template>

<style lang="scss" module>
.section {
	margin-bottom: var(--spacing--xl);
}

.settingRow {
	max-width: 300px;
}

.projectRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 220px;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) 0;
	max-width: 640px;

	&:not(:last-child) {
		border-bottom: 1px solid var(--color--foreground--tint-1);
	}

	:global(.el-select) {
		width: 220px;
	}
}

.projectName {
	display: block;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
