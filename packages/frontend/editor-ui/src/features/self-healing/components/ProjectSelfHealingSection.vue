<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nAvatar,
	N8nButton,
	N8nDataTableServer,
	N8nLink,
	N8nSwitch,
	N8nText,
	type IUser,
	type TableHeader,
	type TableOptions,
	type UserAction,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import TimeAgo from '@/app/components/TimeAgo.vue';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '@/features/workflow-reviews/constants';

import {
	SELF_HEALING_CONFIG_VIEW,
	SELF_HEALING_NEW_CONFIG_ID,
	SELF_HEALING_SETTINGS_HASH,
} from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';
import type { SelfHealingConfig } from '../selfHealing.types';

type ConfigAction = 'edit' | 'delete';

const props = defineProps<{
	projectId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const route = useRoute();
const router = useRouter();
const store = useSelfHealingStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();

const sectionRef = ref<HTMLElement | null>(null);

const configs = computed(() => store.getProjectConfigs(props.projectId));

// Same shape as the members table above: one page, sorting off.
const tableOptions = ref<TableOptions>({ page: 0, itemsPerPage: 10, sortBy: [] });

const headers = computed<Array<TableHeader<SelfHealingConfig>>>(() => [
	{
		title: i18n.baseText('selfHealing.projectSettings.column.scope'),
		key: 'scope',
		width: 240,
		disableSort: true,
		value: (row: SelfHealingConfig) => `${row.scope}:${row.selectedWorkflowIds.length}`,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.autonomy'),
		key: 'autonomy',
		width: 200,
		disableSort: true,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.reviewers'),
		key: 'reviewers',
		width: 200,
		disableSort: true,
		value: (row: SelfHealingConfig) => row.reviewerIds,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.lastActivity'),
		key: 'lastActivity',
		width: 200,
		disableSort: true,
		value: (row: SelfHealingConfig) => store.getLastActivity(props.projectId, row.id)?.at,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.active'),
		key: 'status',
		width: 110,
		disableSort: true,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 46,
		disableSort: true,
		value() {
			return;
		},
	},
]);

/** Configurations that select workflows win, so an active "All workflows" one gets what is left. */
const hasActiveSelectedConfig = computed(() =>
	configs.value.some((config) => config.scope === 'selected' && config.status === 'active'),
);

function scopeLabel(config: SelfHealingConfig): string {
	if (config.scope === 'all') {
		return i18n.baseText(
			config.status === 'active' && hasActiveSelectedConfig.value
				? 'selfHealing.scope.allOther'
				: 'selfHealing.scope.all',
		);
	}
	const count = config.selectedWorkflowIds.length;
	const subCount = config.includeSubWorkflows ? config.subWorkflowIds.length : 0;
	// Each count takes its own plural form.
	const selected = i18n.baseText('selfHealing.scope.selected', {
		adjustToNumber: count,
		interpolate: { count: String(count) },
	});
	if (subCount === 0) return selected;
	return i18n.baseText('selfHealing.scope.selectedWithSubWorkflows', {
		adjustToNumber: subCount,
		interpolate: { selected, subCount: String(subCount) },
	});
}

/** The latest outcome of a configuration, worded like its item in the review inbox. */
function lastActivityFor(config: SelfHealingConfig) {
	const activity = store.getLastActivity(props.projectId, config.id);
	if (!activity) return null;
	const labelKey = {
		fix_ready: 'selfHealing.inbox.kind.fix',
		healed: 'selfHealing.badge.healed',
		needs_you: 'selfHealing.inbox.kind.needs_you',
		could_not_fix: 'selfHealing.inbox.kind.could_not_fix',
	} as const;
	return {
		label: i18n.baseText(labelKey[activity.outcome]),
		at: activity.at,
		route: { name: WORKFLOW_REVIEW_REQUESTS_VIEW, params: { reviewRequestId: activity.reviewId } },
	};
}

const lastActivities = computed(
	() => new Map(configs.value.map((config) => [config.id, lastActivityFor(config)])),
);

function autonomyLabel(config: SelfHealingConfig): string {
	return i18n.baseText(`selfHealing.autonomy.${config.autonomy}.label`);
}

const projectName = computed(() => projectsStore.currentProject?.name ?? '');
const projectIcon = computed(() => projectsStore.currentProject?.icon ?? DEFAULT_PROJECT_ICON);

/** Individually picked people, resolved through the project's members, then any known user. */
function pickedUsers(config: SelfHealingConfig): IUser[] {
	const relations = projectsStore.currentProject?.relations ?? [];
	return config.reviewerIds.flatMap((id) => {
		const relation = relations.find((candidate) => candidate.id === id);
		const user = relation
			? {
					id: relation.id,
					email: relation.email,
					firstName: relation.firstName,
					lastName: relation.lastName,
				}
			: usersStore.usersById[id];
		return user ? [user] : [];
	});
}

function userName(user: IUser): string {
	return [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.email ?? '');
}

// Pausing and resuming moved to the switch in the Active column.
const configActions = computed<Array<UserAction<IUser>>>(() => [
	{ label: i18n.baseText('generic.edit'), value: 'edit' },
	{ label: i18n.baseText('generic.delete'), value: 'delete' },
]);

/** Creating and editing happen on a sub-page; `configId` "new" creates one. */
async function openConfig(configId: string) {
	await router.push({
		name: SELF_HEALING_CONFIG_VIEW,
		params: { projectId: props.projectId, configId },
	});
}

async function onAction(config: SelfHealingConfig, action: string) {
	switch (action as ConfigAction) {
		case 'edit':
			await openConfig(config.id);
			break;
		case 'delete': {
			const confirmed = await message.confirm(
				i18n.baseText('selfHealing.projectSettings.delete.message'),
				i18n.baseText('selfHealing.projectSettings.delete.headline'),
				{
					type: 'warning',
					confirmButtonText: i18n.baseText('generic.delete'),
					cancelButtonText: i18n.baseText('generic.cancel'),
				},
			);
			if (confirmed !== MODAL_CONFIRM) return;
			store.deleteConfig(props.projectId, config.id);
			toast.showMessage({
				title: i18n.baseText('selfHealing.projectSettings.deleted'),
				type: 'success',
			});
			break;
		}
	}
}

/**
 * Saves at once, like the switches on the instance settings pages. Turning one
 * on can fail (a workflow is already in another active configuration) or pause
 * the other "All workflows" configuration; the toast says which.
 */
function onActiveChange(config: SelfHealingConfig, active: boolean) {
	if (!active) {
		store.setConfigStatus(props.projectId, config.id, 'paused');
		toast.showMessage({
			title: i18n.baseText('selfHealing.projectSettings.paused'),
			type: 'success',
		});
		return;
	}

	const result = store.activateConfig(props.projectId, config.id);
	if (result.status === 'conflict') {
		toast.showMessage({
			title: i18n.baseText('selfHealing.projectSettings.conflict.title'),
			message: i18n.baseText('selfHealing.projectSettings.conflict.message', {
				adjustToNumber: result.workflowIds.length,
				interpolate: { count: String(result.workflowIds.length) },
			}),
			type: 'error',
		});
		return;
	}
	toast.showMessage({
		title: i18n.baseText('selfHealing.projectSettings.activated'),
		message:
			result.pausedConfigIds.length > 0
				? i18n.baseText('selfHealing.projectSettings.otherAllPaused')
				: undefined,
		type: 'success',
	});
}

// The workflow settings modal and the configuration page link here, so bring
// the section into view.
onMounted(async () => {
	if (route.hash !== SELF_HEALING_SETTINGS_HASH) return;
	await nextTick();
	sectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
</script>

<template>
	<fieldset
		:id="SELF_HEALING_SETTINGS_HASH.slice(1)"
		ref="sectionRef"
		data-test-id="project-self-healing-section"
	>
		<h3>
			<label>{{ i18n.baseText('selfHealing.title') }}</label>
		</h3>

		<div v-if="configs.length > 0" :class="$style.table" data-test-id="self-healing-config-list">
			<N8nDataTableServer
				v-model:sort-by="tableOptions.sortBy"
				v-model:page="tableOptions.page"
				:items-per-page="configs.length"
				:headers="headers"
				:items="configs"
				:items-length="configs.length"
				:page-sizes="[configs.length + 1]"
			>
				<template #[`item.scope`]="{ item }">
					<N8nText size="medium" color="text-dark" data-test-id="self-healing-config-row">
						{{ scopeLabel(item) }}
					</N8nText>
				</template>
				<template #[`item.autonomy`]="{ item }">
					<N8nText size="medium" color="text-dark">{{ autonomyLabel(item) }}</N8nText>
				</template>
				<template #[`item.reviewers`]="{ item }">
					<div
						v-if="item.notifyProjectMembers || pickedUsers(item).length > 0"
						:class="$style.people"
						data-test-id="self-healing-config-reviewers"
					>
						<div v-if="item.notifyProjectMembers" :class="$style.person">
							<span :class="$style.projectAvatar">
								<ProjectIcon :icon="projectIcon" size="mini" round border-less />
							</span>
							<N8nText size="medium" color="text-dark" :class="$style.personName">
								{{
									i18n.baseText('selfHealing.people.projectMembers', {
										interpolate: { project: projectName },
									})
								}}
							</N8nText>
						</div>
						<div v-for="user in pickedUsers(item)" :key="user.id" :class="$style.person">
							<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="xsmall" />
							<N8nText size="medium" color="text-dark" :class="$style.personName">
								{{ userName(user) }}
							</N8nText>
						</div>
					</div>
					<N8nText v-else size="medium" color="text-light">
						{{ i18n.baseText('selfHealing.projectSettings.noReviewers') }}
					</N8nText>
				</template>
				<template #[`item.lastActivity`]="{ item }">
					<N8nLink
						v-if="lastActivities.get(item.id)"
						:to="lastActivities.get(item.id)?.route"
						theme="text"
						size="medium"
						data-test-id="self-healing-config-last-activity"
					>
						{{ lastActivities.get(item.id)?.label }} ·
						<TimeAgo :date="lastActivities.get(item.id)?.at ?? ''" />
					</N8nLink>
					<N8nText v-else size="medium" color="text-light">
						{{ i18n.baseText('selfHealing.projectSettings.lastActivity.none') }}
					</N8nText>
				</template>
				<template #[`item.status`]="{ item }">
					<N8nSwitch
						:model-value="item.status === 'active'"
						data-test-id="self-healing-config-active"
						@update:model-value="onActiveChange(item, $event)"
					/>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						:actions="configActions"
						placement="bottom"
						theme="dark"
						data-test-id="self-healing-config-actions"
						@action="onAction(item, $event)"
					/>
				</template>
			</N8nDataTableServer>
		</div>
		<N8nText
			v-else
			size="small"
			color="text-light"
			:class="$style.empty"
			data-test-id="self-healing-config-empty"
		>
			{{ i18n.baseText('selfHealing.projectSettings.empty') }}
		</N8nText>

		<N8nButton
			variant="subtle"
			size="large"
			icon="plus"
			native-type="button"
			:label="i18n.baseText('selfHealing.projectSettings.add')"
			data-test-id="self-healing-add-config"
			@click="openConfig(SELF_HEALING_NEW_CONFIG_ID)"
		/>
	</fieldset>
</template>

<style lang="scss" module>
.table {
	margin-bottom: var(--spacing--sm);
}

.people {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) 0;
}

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.personName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

// Same footprint as the extra-small person avatar next to it.
.projectAvatar {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border-radius: 50%;
	background-color: var(--color--background--light-3);
}

.empty {
	display: block;
	margin-bottom: var(--spacing--sm);
}
</style>
