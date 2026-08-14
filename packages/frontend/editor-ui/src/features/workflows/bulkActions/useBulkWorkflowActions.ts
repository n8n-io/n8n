import { computed, ref, type Ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import type { WorkflowListResource } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

import {
	bulkArchiveWorkflowsApi,
	bulkDeleteWorkflowsApi,
	bulkToggleMcpAccess,
	bulkTransferWorkflowsApi,
	bulkUnpublishWorkflowsApi,
	mockCompletedResult,
	normalizeWorkflowActionResult,
} from './bulkActions.api';
import type {
	BulkActionConfig,
	BulkActionId,
	BulkActionResult,
	BulkSelectableResource,
	ResolvedBulkAction,
} from './bulkActions.types';

/**
 * Static, prototype-scoped definition of one bulk action. `isAllowed` is the
 * boundary where real per-item permission/scope checks would later live; today
 * it only encodes the intrinsic validity each action needs (e.g. Delete needs an
 * archived, unpublished workflow).
 */
type ActionSpec = {
	id: BulkActionId;
	priority: number;
	destructive: boolean;
	/** Share/Move gather a destination/recipients before confirmation. */
	needsConfig: boolean;
	/** Share/Move/Delete must apply to the whole selection or they hide. */
	requiresFullSelection: boolean;
	requiresMcp?: boolean;
	isAllowed: (r: BulkSelectableResource) => boolean;
	willChange: (r: BulkSelectableResource) => boolean;
};

const ACTION_SPECS: ActionSpec[] = [
	{
		id: 'move',
		priority: 1,
		destructive: false,
		needsConfig: true,
		requiresFullSelection: true,
		isAllowed: () => true,
		willChange: () => true,
	},
	{
		id: 'archive',
		priority: 2,
		destructive: false,
		needsConfig: false,
		requiresFullSelection: false,
		isAllowed: () => true,
		willChange: (r) => !r.isArchived,
	},
	{
		id: 'unarchive',
		priority: 3,
		destructive: false,
		needsConfig: false,
		requiresFullSelection: false,
		isAllowed: () => true,
		willChange: (r) => r.isArchived,
	},
	{
		id: 'unpublish',
		priority: 4,
		destructive: false,
		needsConfig: false,
		requiresFullSelection: false,
		isAllowed: () => true,
		willChange: (r) => r.activeVersionId !== null,
	},
	{
		id: 'share',
		priority: 5,
		destructive: false,
		needsConfig: true,
		requiresFullSelection: true,
		isAllowed: () => true,
		willChange: () => true,
	},
	{
		id: 'enableMcp',
		priority: 6,
		destructive: false,
		needsConfig: false,
		requiresFullSelection: false,
		requiresMcp: true,
		isAllowed: () => true,
		willChange: (r) => !r.settings?.availableInMCP,
	},
	{
		id: 'disableMcp',
		priority: 7,
		destructive: false,
		needsConfig: false,
		requiresFullSelection: false,
		requiresMcp: true,
		isAllowed: () => true,
		willChange: (r) => !!r.settings?.availableInMCP,
	},
	{
		id: 'delete',
		priority: 8,
		destructive: true,
		needsConfig: false,
		requiresFullSelection: true,
		isAllowed: (r) => r.isArchived && r.activeVersionId === null,
		willChange: () => true,
	},
];

export function useBulkWorkflowActions(options: {
	selectedItems: Ref<BulkSelectableResource[]>;
	workflowsAndFolders: Ref<WorkflowListResource[]>;
	mcpEnabled: Ref<boolean | undefined>;
}) {
	const { selectedItems, workflowsAndFolders, mcpEnabled } = options;
	const i18n = useI18n();
	const rootStore = useRootStore();

	const labelFor = (id: BulkActionId) => i18n.baseText(`workflows.bulkActions.action.${id}`);

	const availableActions = computed<ResolvedBulkAction[]>(() => {
		const selection = selectedItems.value;
		if (selection.length === 0) return [];

		const resolved: ResolvedBulkAction[] = [];

		for (const spec of ACTION_SPECS) {
			if (spec.requiresMcp && !mcpEnabled.value) continue;
			// Full-selection actions hide unless the whole selection is valid.
			if (spec.requiresFullSelection && !selection.every(spec.isAllowed)) continue;

			const affected = selection.filter((item) => spec.isAllowed(item) && spec.willChange(item));
			// Nothing to do (e.g. everything already archived) — hide it.
			if (affected.length === 0) continue;

			const unchanged = selection.filter(
				(item) => !(spec.isAllowed(item) && spec.willChange(item)),
			);

			resolved.push({
				id: spec.id,
				label: labelFor(spec.id),
				priority: spec.priority,
				destructive: spec.destructive,
				enabled: true,
				affected,
				unchanged,
				needsConfig: spec.needsConfig,
			});
		}

		return resolved.sort((a, b) => a.priority - b.priority);
	});

	const hasActions = computed(() => availableActions.value.length > 0);

	// ── Dialog state ──
	const activeActionId = ref<BulkActionId | null>(null);
	const activeAction = computed<ResolvedBulkAction | null>(
		() => availableActions.value.find((a) => a.id === activeActionId.value) ?? null,
	);

	const openAction = (id: BulkActionId) => {
		activeActionId.value = id;
	};
	const closeDialog = () => {
		activeActionId.value = null;
	};

	// ── Local projection updates for mocked operations ──

	const workflowItemsById = () =>
		new Map(
			workflowsAndFolders.value
				.filter((item) => item.resource !== 'folder')
				.map((item) => [item.id, item]),
		);

	const applyUnarchiveProjection = (affected: BulkSelectableResource[]) => {
		const byId = workflowItemsById();
		for (const item of affected) {
			const listItem = byId.get(item.id);
			if (listItem) listItem.isArchived = false;
		}
	};

	const applyShareProjection = (
		affected: BulkSelectableResource[],
		recipients: ProjectSharingData[],
	) => {
		const byId = workflowItemsById();
		for (const item of affected) {
			const listItem = byId.get(item.id);
			if (!listItem) continue;
			const existing = listItem.sharedWithProjects ?? [];
			const merged = [...existing];
			for (const recipient of recipients) {
				if (!merged.some((p) => p.id === recipient.id)) merged.push(recipient);
			}
			listItem.sharedWithProjects = merged;
		}
	};

	// ── Execution ──

	async function execute(config: BulkActionConfig = {}): Promise<BulkActionResult> {
		const action = activeAction.value;
		if (!action) throw new Error('No active bulk action');

		const ctx = rootStore.restApiContext;
		const affected = action.affected;

		switch (action.id) {
			case 'archive': {
				const response = await bulkArchiveWorkflowsApi(
					ctx,
					affected.map((w) => w.id),
				);
				return normalizeWorkflowActionResult(response, affected);
			}
			case 'delete': {
				const response = await bulkDeleteWorkflowsApi(
					ctx,
					affected.map((w) => w.id),
				);
				return normalizeWorkflowActionResult(response, affected);
			}
			case 'unpublish': {
				const response = await bulkUnpublishWorkflowsApi(
					ctx,
					affected.map((w) => w.id),
				);
				return normalizeWorkflowActionResult(response, affected);
			}
			case 'move': {
				const destination = config.moveDestination;
				if (destination) {
					const response = await bulkTransferWorkflowsApi(ctx, {
						workflowIds: affected.map((w) => w.id),
						destinationProjectId: destination.projectId,
						destinationParentFolderId: destination.folderId,
					});
					return normalizeWorkflowActionResult(response, affected);
				}
				return mockCompletedResult(affected);
			}
			case 'enableMcp':
			case 'disableMcp':
				return await bulkToggleMcpAccess(ctx, {
					workflows: affected,
					availableInMCP: action.id === 'enableMcp',
				});
			case 'unarchive':
				applyUnarchiveProjection(affected);
				return mockCompletedResult(affected);
			case 'share':
				applyShareProjection(affected, config.shareRecipients ?? []);
				return mockCompletedResult(affected);
			default:
				throw new Error(`Unhandled bulk action: ${action.id as string}`);
		}
	}

	return {
		availableActions,
		hasActions,
		activeAction,
		activeActionId,
		openAction,
		closeDialog,
		execute,
	};
}
