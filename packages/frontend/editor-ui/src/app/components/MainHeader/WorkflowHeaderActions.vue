<script lang="ts" setup>
import { computed, useCssModule, useTemplateRef } from 'vue';
import { useUIStore } from '@/app/stores/ui.store';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import type { IWorkflowDb } from '@/Interface';
import { EnterpriseEditionFeature, WORKFLOW_SHARE_MODAL_KEY, VIEWS } from '@/app/constants';
import WorkflowActivator from '@/app/components/WorkflowActivator.vue';
import EnterpriseEdition from '@/app/components/EnterpriseEdition.ee.vue';
import CollaborationPane from '@/features/collaboration/collaboration/components/CollaborationPane.vue';
import WorkflowHistoryButton from '@/features/workflows/workflowHistory/components/WorkflowHistoryButton.vue';
import SaveButton from '@/app/components/SaveButton.vue';
import { I18nT } from 'vue-i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useRoute } from 'vue-router';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import type { FolderShortInfo } from '@/features/core/folders/folders.types';
import ActionsMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';

const i18n = useI18n();
const uiStore = useUIStore();
const telemetry = useTelemetry();
const usersStore = useUsersStore();
const route = useRoute();
const pageRedirectionHelper = usePageRedirectionHelper();
const $style = useCssModule();

const props = defineProps<{
	readOnly?: boolean;
	id: IWorkflowDb['id'];
	tags: IWorkflowDb['tags'];
	name: IWorkflowDb['name'];
	meta: IWorkflowDb['meta'];
	active: IWorkflowDb['active'];
	currentFolder?: FolderShortInfo;
	isArchived: IWorkflowDb['isArchived'];
	isNewWorkflow: boolean;
	workflowPermissions: PermissionsRecord['workflow'];
}>();

const emit = defineEmits<{
	'workflow:deactivated': [];
	'workflow:saved': [];
}>();

const isWorkflowSaving = computed(() => {
	return uiStore.isActionActive.workflowSaving;
});

const actionsMenuRef = useTemplateRef<InstanceType<typeof ActionsMenu>>('actionsMenu');
const importFileRef = computed(() => actionsMenuRef.value?.importFileRef);

const onWorkflowActiveToggle = async (value: { id: string; active: boolean }) => {
	if (!value.active) {
		emit('workflow:deactivated');
	}
};

function onShareButtonClick() {
	uiStore.openModalWithData({
		name: WORKFLOW_SHARE_MODAL_KEY,
		data: { id: props.id },
	});

	telemetry.track('User opened sharing modal', {
		workflow_id: props.id,
		user_id_sharer: usersStore.currentUser?.id,
		sub_view: route.name === VIEWS.WORKFLOWS ? 'Workflows listing' : 'Workflow editor',
	});
}

function goToUpgrade() {
	void pageRedirectionHelper.goToUpgrade('workflow_sharing', 'upgrade-workflow-sharing');
}

defineExpose({
	importFileRef,
});
</script>
<template>
	<div :class="$style.container">
		<span :class="[$style.activator, $style.group]">
			<WorkflowActivator
				:is-archived="isArchived"
				:workflow-active="active"
				:workflow-id="id"
				:workflow-permissions="workflowPermissions"
				@update:workflow-active="onWorkflowActiveToggle"
			/>
		</span>
		<EnterpriseEdition :features="[EnterpriseEditionFeature.Sharing]">
			<div :class="$style.group">
				<CollaborationPane v-if="!isNewWorkflow" />
				<N8nButton
					type="secondary"
					data-test-id="workflow-share-button"
					@click="onShareButtonClick"
				>
					{{ i18n.baseText('workflowDetails.share') }}
				</N8nButton>
			</div>
			<template #fallback>
				<N8nTooltip>
					<N8nButton type="secondary" :class="['mr-2xs', $style.disabledShareButton]">
						{{ i18n.baseText('workflowDetails.share') }}
					</N8nButton>
					<template #content>
						<I18nT
							:keypath="
								uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable.description
									.tooltip
							"
							tag="span"
							scope="global"
						>
							<template #action>
								<a @click="goToUpgrade">
									{{
										i18n.baseText(
											uiStore.contextBasedTranslationKeys.workflows.sharing.unavailable
												.button as BaseTextKey,
										)
									}}
								</a>
							</template>
						</I18nT>
					</template>
				</N8nTooltip>
			</template>
		</EnterpriseEdition>
		<div :class="$style.group">
			<SaveButton
				type="primary"
				:saved="!uiStore.stateIsDirty && !isNewWorkflow"
				:disabled="
					isWorkflowSaving ||
					readOnly ||
					isArchived ||
					(!isNewWorkflow && !workflowPermissions.update)
				"
				:is-saving="isWorkflowSaving"
				:with-shortcut="!readOnly && !isArchived && workflowPermissions.update"
				:shortcut-tooltip="i18n.baseText('saveWorkflowButton.hint')"
				data-test-id="workflow-save-button"
				@click="$emit('workflow:saved')"
			/>
			<WorkflowHistoryButton :workflow-id="props.id" :is-new-workflow="isNewWorkflow" />
			<ActionsMenu
				:id="id"
				ref="actionsMenu"
				:workflow-permissions="workflowPermissions"
				:is-new-workflow="isNewWorkflow"
				:read-only="readOnly"
				:is-archived="isArchived"
				:name="name"
				:tags="tags"
				:current-folder="currentFolder"
				:meta="meta"
				@workflow:saved="$emit('workflow:saved')"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
$--text-line-height: 24px;

.container {
	display: contents;
}

.activator {
	color: $custom-font-dark;
	font-weight: var(--font-weight--regular);
	font-size: 13px;
	line-height: $--text-line-height;
	align-items: center;

	> span {
		margin-right: 5px;
	}
}

.group {
	display: flex;
	gap: var(--spacing--xs);
}

.disabledShareButton {
	cursor: not-allowed;
}
</style>
