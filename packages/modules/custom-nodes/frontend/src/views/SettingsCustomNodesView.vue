<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nNodeIcon,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import type {
	CustomActionResponse,
	CustomNodeResponse,
	ParentCustomActionResponse,
} from '@n8n/api-types';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useTypeNames } from '../composables/useTypeNames';
import { CUSTOM_NODE_UPDATE_SCOPE } from '../custom-nodes.constants';
import { useCustomNodesStore } from '../custom-nodes.store';
import ActionHistoryDialog from '../history/ActionHistoryDialog.vue';
import NodeIconUpload from '../icon/NodeIconUpload.vue';
import CustomActionWizardModal from '../wizard/CustomActionWizardModal.vue';
import type { CustomActionWizardData } from '../wizard/wizard.types';

type PendingDelete = { kind: 'node' | 'action'; id: string; name: string };

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const store = useCustomNodesStore();
const typeNames = useTypeNames();
const rbacStore = useRBACStore();

const loaded = ref(false);
const pendingDelete = ref<PendingDelete | null>(null);
const deleting = ref(false);

const parentGroups = computed(() => {
	const groups = new Map<string, ParentCustomActionResponse[]>();
	for (const action of store.parentActions) {
		const key = action.parentNodeType ?? '';
		groups.set(key, [...(groups.get(key) ?? []), action]);
	}
	return [...groups.entries()].map(([parentNodeType, actions]) => ({ parentNodeType, actions }));
});

const isEmpty = computed(
	() => loaded.value && store.nodes.length === 0 && store.parentActions.length === 0,
);

const dialogOpen = computed(() => pendingDelete.value !== null);

const canEdit = computed(() => rbacStore.hasScope(CUSTOM_NODE_UPDATE_SCOPE));

// The icon URL stays the same after an upload, so a query param busts the image cache.
const iconNonce = ref(0);

function iconSrc(node: CustomNodeResponse) {
	return `${store.iconUrl(node.id)}?v=${encodeURIComponent(node.updatedAt)}-${iconNonce.value}`;
}

const historyOpen = ref(false);
const historyActionId = ref<string | null>(null);

// Read from the store, so the dialog shows new data after a rollback.
const historyAction = computed<CustomActionResponse | undefined>(() => {
	const id = historyActionId.value;
	return (
		store.parentActions.find((action) => action.id === id) ??
		store.nodes.flatMap((node) => node.actions).find((action) => action.id === id)
	);
});

function openHistory(actionId: string) {
	historyActionId.value = actionId;
	historyOpen.value = true;
}

const wizardOpen = ref(false);
const wizardData = ref<CustomActionWizardData>({ mode: 'create' });

function openWizard(data: CustomActionWizardData) {
	wizardData.value = data;
	wizardOpen.value = true;
}

function openCreate() {
	openWizard({ mode: 'create' });
}

function openAddAction(node: CustomNodeResponse) {
	openWizard({ mode: 'create', customNodeId: node.id });
}

function openEdit(actionId: string) {
	openWizard({ mode: 'edit', actionId });
}

function nodeDescription(node: CustomNodeResponse) {
	return i18n.baseText('customNodes.settings.node.actionCount', {
		adjustToNumber: node.actions.length,
		interpolate: { count: String(node.actions.length) },
	});
}

function askDelete(target: PendingDelete) {
	pendingDelete.value = target;
}

function onDialogOpenChange(open: boolean) {
	if (!open && !deleting.value) pendingDelete.value = null;
}

async function confirmDelete() {
	const target = pendingDelete.value;
	if (!target) return;
	deleting.value = true;
	try {
		if (target.kind === 'node') await store.deleteNode(target.id);
		else await store.deleteAction(target.id);
		toast.showMessage({
			title: i18n.baseText('customNodes.settings.delete.success'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.settings.delete.error'));
	} finally {
		deleting.value = false;
		pendingDelete.value = null;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('customNodes.settings.title'));
	void typeNames.load();
	try {
		await store.fetchAll();
	} catch (error) {
		toast.showError(error, i18n.baseText('customNodes.settings.load.error'));
	} finally {
		loaded.value = true;
	}
});
</script>

<template>
	<N8nSettingsLayout>
		<N8nSettingsPageHeader
			:title="i18n.baseText('customNodes.settings.title')"
			:description="i18n.baseText('customNodes.settings.description')"
			:show-docs-link="false"
			data-test-id="custom-nodes-header"
		>
			<template #titleTrailing>
				<N8nButton
					variant="solid"
					icon="plus"
					:label="i18n.baseText('customNodes.settings.create')"
					data-test-id="custom-nodes-create"
					@click="openCreate"
				/>
			</template>
		</N8nSettingsPageHeader>

		<div v-if="isEmpty" :class="$style.empty" data-test-id="custom-nodes-empty-state">
			<N8nText color="text-light">
				{{ i18n.baseText('customNodes.settings.empty') }}
			</N8nText>
			<div>
				<N8nButton
					variant="outline"
					icon="plus"
					:label="i18n.baseText('customNodes.settings.create')"
					data-test-id="custom-nodes-empty-create"
					@click="openCreate"
				/>
			</div>
		</div>

		<N8nSettingsSection
			v-if="store.nodes.length > 0"
			:title="i18n.baseText('customNodes.settings.nodes.title')"
			data-test-id="custom-nodes-nodes-section"
		>
			<N8nSettingsRowGroup v-for="node in store.nodes" :key="node.id">
				<N8nSettingsRow
					:title="node.displayName"
					:description="node.description || nodeDescription(node)"
					data-test-id="custom-nodes-node-row"
				>
					<template #visual>
						<N8nNodeIcon v-if="node.hasIcon" type="file" :src="iconSrc(node)" :size="24" />
						<N8nNodeIcon v-else type="icon" name="blocks" :size="24" />
					</template>
					<template #action>
						<div :class="$style.actions">
							<NodeIconUpload v-if="canEdit" :node-id="node.id" @uploaded="iconNonce += 1" />
							<N8nButton
								variant="ghost"
								icon="plus"
								:label="i18n.baseText('customNodes.settings.addAction')"
								data-test-id="custom-nodes-add-action"
								@click="openAddAction(node)"
							/>
							<N8nButton
								variant="ghost"
								icon="trash-2"
								icon-only
								:aria-label="i18n.baseText('customNodes.settings.delete.button')"
								data-test-id="custom-nodes-delete-node"
								@click="askDelete({ kind: 'node', id: node.id, name: node.displayName })"
							/>
						</div>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow
					v-for="action in node.actions"
					:key="action.id"
					:title="action.name"
					:description="action.description"
					data-test-id="custom-nodes-node-action-row"
				>
					<template #action>
						<div :class="$style.actions">
							<N8nButton
								variant="ghost"
								icon="history"
								:label="i18n.baseText('customNodes.settings.history')"
								data-test-id="custom-nodes-history-node-action"
								@click="openHistory(action.id)"
							/>
							<N8nButton
								v-if="canEdit"
								variant="ghost"
								icon="pencil"
								:label="i18n.baseText('customNodes.settings.edit')"
								data-test-id="custom-nodes-edit-node-action"
								@click="openEdit(action.id)"
							/>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-for="group in parentGroups"
			:key="group.parentNodeType"
			:title="
				i18n.baseText('customNodes.settings.parent.title', {
					interpolate: { parent: typeNames.nodeDisplayName(group.parentNodeType) },
				})
			"
			data-test-id="custom-nodes-parent-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="action in group.actions"
					:key="action.id"
					:title="action.name"
					:description="action.description"
					data-test-id="custom-nodes-parent-action-row"
				>
					<template #action>
						<div :class="$style.actions">
							<N8nButton
								variant="ghost"
								icon="history"
								:label="i18n.baseText('customNodes.settings.history')"
								data-test-id="custom-nodes-history-parent-action"
								@click="openHistory(action.id)"
							/>
							<N8nButton
								v-if="canEdit"
								variant="ghost"
								icon="pencil"
								:label="i18n.baseText('customNodes.settings.edit')"
								data-test-id="custom-nodes-edit-action"
								@click="openEdit(action.id)"
							/>
							<N8nButton
								variant="ghost"
								icon="trash-2"
								icon-only
								:aria-label="i18n.baseText('customNodes.settings.delete.button')"
								data-test-id="custom-nodes-delete-action"
								@click="askDelete({ kind: 'action', id: action.id, name: action.name })"
							/>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<ActionHistoryDialog v-model:open="historyOpen" :action="historyAction" />

		<CustomActionWizardModal v-model:open="wizardOpen" :data="wizardData" />

		<N8nAlertDialog
			:open="dialogOpen"
			:title="
				i18n.baseText('customNodes.settings.delete.title', {
					interpolate: { name: pendingDelete?.name ?? '' },
				})
			"
			:description="
				pendingDelete?.kind === 'node'
					? i18n.baseText('customNodes.settings.delete.node.description')
					: i18n.baseText('customNodes.settings.delete.action.description')
			"
			:action-label="i18n.baseText('generic.delete')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="deleting"
			@action="confirmDelete"
			@cancel="pendingDelete = null"
			@update:open="onDialogOpenChange"
		/>
	</N8nSettingsLayout>
</template>

<style module lang="scss">
.empty {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}
</style>
