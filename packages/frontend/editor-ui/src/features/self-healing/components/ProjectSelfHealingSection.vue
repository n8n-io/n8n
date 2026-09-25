<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import {
	N8nActionToggle,
	N8nAvatar,
	N8nButton,
	N8nDataTableServer,
	N8nStatusDot,
	N8nText,
	type IUser,
	type TableHeader,
	type TableOptions,
	type UserAction,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { SELF_HEALING_SETTINGS_HASH } from '../selfHealing.constants';
import { useSelfHealingStore } from '../selfHealing.store';
import type { SelfHealingConfig } from '../selfHealing.types';
import SelfHealingConfigDialog from './SelfHealingConfigDialog.vue';

type ConfigAction = 'edit' | 'pause' | 'resume' | 'delete';

const props = defineProps<{
	projectId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const route = useRoute();
const store = useSelfHealingStore();
const projectsStore = useProjectsStore();
const usersStore = useUsersStore();

const sectionRef = ref<HTMLElement | null>(null);
const dialogOpen = ref(false);
const editingConfig = ref<SelfHealingConfig | null>(null);

const configs = computed(() => store.getProjectConfigs(props.projectId));

// Same shape as the members table above: one page, sorting off.
const tableOptions = ref<TableOptions>({ page: 0, itemsPerPage: 10, sortBy: [] });

const headers = computed<Array<TableHeader<SelfHealingConfig>>>(() => [
	{
		title: i18n.baseText('selfHealing.projectSettings.column.scope'),
		key: 'scope',
		width: 260,
		disableSort: true,
		value: (row: SelfHealingConfig) => `${row.scope}:${row.selectedWorkflowIds.length}`,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.autonomy'),
		key: 'autonomy',
		width: 220,
		disableSort: true,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.reviewers'),
		key: 'reviewers',
		width: 220,
		disableSort: true,
		value: (row: SelfHealingConfig) => row.reviewerIds,
	},
	{
		title: i18n.baseText('selfHealing.projectSettings.column.status'),
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

function scopeLabel(config: SelfHealingConfig): string {
	if (config.scope === 'all') return i18n.baseText('selfHealing.scope.all');
	const count = String(config.selectedWorkflowIds.length);
	const subCount = config.includeSubWorkflows ? config.subWorkflowIds.length : 0;
	return subCount > 0
		? i18n.baseText('selfHealing.scope.selectedWithSubWorkflows', {
				adjustToNumber: subCount,
				interpolate: { count, subCount: String(subCount) },
			})
		: i18n.baseText('selfHealing.scope.selected', { interpolate: { count } });
}

function autonomyLabel(config: SelfHealingConfig): string {
	return i18n.baseText(`selfHealing.autonomy.${config.autonomy}.label`);
}

function statusLabel(config: SelfHealingConfig): string {
	return i18n.baseText(`selfHealing.status.${config.status}`);
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

function actionsFor(config: SelfHealingConfig): Array<UserAction<IUser>> {
	return [
		{ label: i18n.baseText('generic.edit'), value: 'edit' },
		config.status === 'active'
			? { label: i18n.baseText('selfHealing.projectSettings.action.pause'), value: 'pause' }
			: { label: i18n.baseText('selfHealing.projectSettings.action.resume'), value: 'resume' },
		{ label: i18n.baseText('generic.delete'), value: 'delete' },
	];
}

function openCreate() {
	editingConfig.value = null;
	dialogOpen.value = true;
}

function openEdit(config: SelfHealingConfig) {
	editingConfig.value = config;
	dialogOpen.value = true;
}

async function onAction(config: SelfHealingConfig, action: string) {
	switch (action as ConfigAction) {
		case 'edit':
			openEdit(config);
			break;
		case 'pause':
			store.setConfigStatus(props.projectId, config.id, 'paused');
			break;
		case 'resume':
			store.setConfigStatus(props.projectId, config.id, 'active');
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

function onSaved() {
	toast.showMessage({
		title: i18n.baseText('selfHealing.projectSettings.saved'),
		type: 'success',
	});
}

// The workflow settings modal deep-links here, so bring the section into view.
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
				<template #[`item.status`]="{ item }">
					<div :class="$style.statusCell">
						<N8nStatusDot :variant="item.status === 'active' ? 'success' : 'warning'" />
						<N8nText size="medium" color="text-dark">{{ statusLabel(item) }}</N8nText>
					</div>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						:actions="actionsFor(item)"
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
			@click="openCreate"
		/>

		<SelfHealingConfigDialog
			v-model:open="dialogOpen"
			:project-id="projectId"
			:config="editingConfig"
			@saved="onSaved"
		/>
	</fieldset>
</template>

<style lang="scss" module>
.table {
	margin-bottom: var(--spacing--sm);
}

.statusCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
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
