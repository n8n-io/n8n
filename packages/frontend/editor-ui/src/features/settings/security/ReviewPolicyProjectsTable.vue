<script lang="ts" setup>
import { computed } from 'vue';
import { N8nDataTableServer, N8nSelect2, N8nText, N8nTooltip } from '@n8n/design-system';
import type {
	IconOrEmoji,
	SelectOptionBase,
	SelectValue,
	TableHeader,
	TableOptions,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { DEFAULT_PROJECT_ICON } from '@/features/collaboration/projects/projects.constants';

type ReviewPolicyProject = {
	id: string;
	name: string;
	icon: IconOrEmoji | null;
	requiredByInstance: boolean;
	requiredByProject: boolean;
};

type ApprovalOption = 'required' | 'notRequired';

const props = defineProps<{
	projects: ReviewPolicyProject[];
	itemsLength: number;
	loading?: boolean;
	readOnly?: boolean;
	/** Set when a broader rule requires approval for every project. Rows then show it, locked. */
	lockedReason?: string;
	savingIds: ReadonlySet<string>;
}>();

defineSlots<{ empty?: () => unknown }>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	'update:required': [projectId: string, required: boolean];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });

const i18n = useI18n();

const headers = computed<Array<TableHeader<ReviewPolicyProject>>>(() => [
	{ title: i18n.baseText('generic.project'), key: 'name', disableSort: true },
	{
		title: i18n.baseText('settings.reviewPolicy.projects.column.approval'),
		key: 'requiredByInstance',
		disableSort: true,
	},
]);

const approvalOptions = computed<Array<SelectOptionBase<ApprovalOption>>>(() => [
	{
		value: 'notRequired',
		label: i18n.baseText('settings.reviewPolicy.projects.option.notRequired'),
		icon: 'lock-unlocked',
	},
	{
		value: 'required',
		label: i18n.baseText('settings.reviewPolicy.projects.option.required'),
		icon: 'lock',
	},
]);

function approvalOf(project: ReviewPolicyProject): ApprovalOption {
	return props.lockedReason !== undefined || project.requiredByInstance
		? 'required'
		: 'notRequired';
}

function showsProjectAdminHint(project: ReviewPolicyProject): boolean {
	return (
		props.lockedReason === undefined && !project.requiredByInstance && project.requiredByProject
	);
}

function onApproval(project: ReviewPolicyProject, value: SelectValue | undefined) {
	const required = value === 'required';
	if (required === project.requiredByInstance) return;
	emit('update:required', project.id, required);
}
</script>

<template>
	<N8nDataTableServer
		v-model:page="tableOptions.page"
		v-model:items-per-page="tableOptions.itemsPerPage"
		:headers="headers"
		:items="projects"
		:items-length="itemsLength"
		:loading="loading"
		:page-sizes="[10, 25, 50]"
		item-value="id"
		@update:options="emit('update:options', $event)"
	>
		<template #[`item.name`]="{ item }">
			<div :class="$style.project">
				<ProjectIcon :icon="item.icon ?? DEFAULT_PROJECT_ICON" size="small" />
				<N8nText>{{ item.name }}</N8nText>
			</div>
		</template>
		<template v-if="$slots.empty" #cover>
			<div :class="$style.empty">
				<slot name="empty" />
			</div>
		</template>
		<template #[`item.requiredByInstance`]="{ item }">
			<div :class="$style.approval">
				<N8nTooltip :disabled="lockedReason === undefined" placement="top">
					<template #content>{{ lockedReason }}</template>
					<!-- A disabled select gets no hover events, so the wrapper takes them. -->
					<span :class="{ [$style.lockedControl]: lockedReason !== undefined }">
						<N8nSelect2
							:class="$style.inlineTrigger"
							:model-value="approvalOf(item)"
							:items="approvalOptions"
							size="small"
							variant="ghost"
							:disabled="readOnly || lockedReason !== undefined || savingIds.has(item.id)"
							:aria-label="
								i18n.baseText('settings.reviewPolicy.projects.approvalFor', {
									interpolate: { project: item.name },
								})
							"
							:data-test-id="`review-policy-project-approval-${item.id}`"
							data-attr="review-policy-project-approval-select"
							@update:model-value="onApproval(item, $event)"
						/>
					</span>
				</N8nTooltip>
				<N8nText v-if="showsProjectAdminHint(item)" size="small" color="text-light">
					{{ i18n.baseText('settings.reviewPolicy.projects.requiredByProjectAdmin') }}
				</N8nText>
			</div>
		</template>
	</N8nDataTableServer>
</template>

<style module>
.project,
.approval {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

/* The select trigger is full width by default. Hug the label instead. */
.inlineTrigger.inlineTrigger {
	width: fit-content;
	max-width: 100%;
}

/* The cover cell has no padding or height. Match the height and inset of a row. */
.empty {
	display: flex;
	align-items: center;
	min-height: var(--spacing--2xl);
	padding: 0 var(--spacing--sm);
}

.lockedControl {
	display: inline-flex;

	> * {
		pointer-events: none;
	}
}
</style>
