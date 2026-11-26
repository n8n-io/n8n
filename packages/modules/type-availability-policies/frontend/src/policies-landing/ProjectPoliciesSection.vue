<script setup lang="ts">
import type { ProjectPolicySummary } from '@n8n/api-types';
import {
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
	N8nTimeAgo,
	N8nTooltip,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import AddProjectPolicyDialog from './AddProjectPolicyDialog.vue';
import { projectPolicySummary } from './projectPolicySummary';
import ProjectPolicyIcon from '../components/ProjectPolicyIcon.vue';
import { PROJECT_POLICY_VIEW } from '../type-availability-policies.constants';

const MAX_PROJECT_CARDS = 4;

const { projects } = defineProps<{ projects: ProjectPolicySummary[] }>();

const emit = defineEmits<{ reload: [] }>();

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();

const dialogOpen = ref(false);

const emptyStateIcon: EmptyStateIconCards = {
	type: 'cards',
	center: 'layers',
	sides: ['blocks', 'key-round'],
	animated: false,
};

const withPolicy = computed(() =>
	projects
		.filter((project) => project.hasPolicy)
		.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')),
);
const withoutPolicy = computed(() => projects.filter((project) => !project.hasPolicy));
const canAdd = computed(() => withoutPolicy.value.length > 0);

function openProjectPolicy(projectId: string) {
	void router.push({ name: PROJECT_POLICY_VIEW, params: { teamProjectId: projectId } });
}
</script>

<template>
	<N8nSettingsSection
		:description="i18n.baseText('typeAvailabilityPolicies.landing.projects.description')"
		data-test-id="policies-landing-projects-section"
	>
		<template #title>
			<div :class="$style.header">
				<N8nHeading tag="h2" step="md" color="text-dark">
					{{ i18n.baseText('typeAvailabilityPolicies.landing.projects') }}
				</N8nHeading>
				<N8nTooltip v-if="withPolicy.length > 0" :disabled="canAdd">
					<template #content>
						{{ i18n.baseText('typeAvailabilityPolicies.landing.projects.allHavePolicy') }}
					</template>
					<N8nButton
						variant="outline"
						size="small"
						icon="plus"
						:disabled="!canAdd"
						data-test-id="policies-landing-add-project-policy"
						@click="dialogOpen = true"
					>
						{{ i18n.baseText('typeAvailabilityPolicies.landing.projects.add') }}
					</N8nButton>
				</N8nTooltip>
			</div>
		</template>

		<N8nEmptyState
			v-if="withPolicy.length === 0"
			:icon="emptyStateIcon"
			:heading="i18n.baseText('typeAvailabilityPolicies.landing.projects.empty.heading')"
			:description="i18n.baseText('typeAvailabilityPolicies.landing.projects.empty.description')"
			:button-text="i18n.baseText('typeAvailabilityPolicies.landing.projects.add')"
			button-variant="outline"
			button-icon="plus"
			:button-disabled="!canAdd"
			data-test-id="policies-landing-projects-empty"
			@click:button="dialogOpen = true"
		>
			<!-- With no card, a disabled button means the instance has no team project. -->
			<template #disabledButtonTooltip>
				{{ i18n.baseText('typeAvailabilityPolicies.landing.projects.noTeamProjects') }}
			</template>
		</N8nEmptyState>

		<template v-else>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="project in withPolicy.slice(0, MAX_PROJECT_CARDS)"
					:key="project.projectId"
					clickable
					:title="project.name"
					data-test-id="policies-landing-project-row"
					@click="openProjectPolicy(project.projectId)"
				>
					<template #visual>
						<ProjectPolicyIcon :icon="project.icon" />
					</template>
					<template #info>
						<N8nText bold size="medium" color="text-dark">{{ project.name }}</N8nText>
						<N8nText size="small" color="text-light">
							{{
								i18n.baseText('typeAvailabilityPolicies.landing.projects.members', {
									adjustToNumber: project.memberCount,
									interpolate: { count: project.memberCount },
								})
							}}
							<template v-if="project.updatedAt">
								· {{ i18n.baseText('typeAvailabilityPolicies.landing.projects.updated') }}
								<N8nTimeAgo :date="project.updatedAt" :locale="rootStore.defaultLocale" />
							</template>
						</N8nText>
						<N8nText
							size="xsmall"
							color="text-light"
							data-test-id="policies-landing-project-summary"
						>
							{{ projectPolicySummary(project) }}
						</N8nText>
					</template>
					<template #action>
						<N8nSettingsRowConfigure :value="i18n.baseText('generic.configure')" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('typeAvailabilityPolicies.landing.projects.all')"
					:description="
						i18n.baseText('typeAvailabilityPolicies.landing.projects.allCount', {
							adjustToNumber: projects.length,
							interpolate: { count: withPolicy.length, total: projects.length },
						})
					"
					data-test-id="policies-landing-all-projects-row"
				/>
			</N8nSettingsRowGroup>
		</template>

		<AddProjectPolicyDialog
			v-model:open="dialogOpen"
			:projects="withoutPolicy"
			@list-changed="emit('reload')"
		/>
	</N8nSettingsSection>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}
</style>
