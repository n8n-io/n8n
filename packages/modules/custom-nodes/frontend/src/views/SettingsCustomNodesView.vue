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
import type { CustomNodeResponse, ParentCustomActionResponse } from '@n8n/api-types';
import { useCustomNodesStore } from '../custom-nodes.store';

type PendingDelete = { kind: 'node' | 'action'; id: string; name: string };

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const store = useCustomNodesStore();

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
		/>

		<N8nText v-if="isEmpty" color="text-light" data-test-id="custom-nodes-empty-state">
			{{ i18n.baseText('customNodes.settings.empty') }}
		</N8nText>

		<N8nSettingsSection
			v-if="store.nodes.length > 0"
			:title="i18n.baseText('customNodes.settings.nodes.title')"
			data-test-id="custom-nodes-nodes-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-for="node in store.nodes"
					:key="node.id"
					:title="node.displayName"
					:description="node.description || nodeDescription(node)"
					data-test-id="custom-nodes-node-row"
				>
					<template #visual>
						<N8nNodeIcon v-if="node.hasIcon" type="file" :src="store.iconUrl(node.id)" :size="24" />
						<N8nNodeIcon v-else type="icon" name="blocks" :size="24" />
					</template>
					<template #action>
						<N8nButton
							variant="ghost"
							icon="trash-2"
							icon-only
							:aria-label="i18n.baseText('customNodes.settings.delete.button')"
							data-test-id="custom-nodes-delete-node"
							@click="askDelete({ kind: 'node', id: node.id, name: node.displayName })"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

		<N8nSettingsSection
			v-for="group in parentGroups"
			:key="group.parentNodeType"
			:title="
				i18n.baseText('customNodes.settings.parent.title', {
					interpolate: { parent: group.parentNodeType },
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
						<N8nButton
							variant="ghost"
							icon="trash-2"
							icon-only
							:aria-label="i18n.baseText('customNodes.settings.delete.button')"
							data-test-id="custom-nodes-delete-action"
							@click="askDelete({ kind: 'action', id: action.id, name: action.name })"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>

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
