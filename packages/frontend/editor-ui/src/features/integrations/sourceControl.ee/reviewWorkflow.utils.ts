import type { ReviewWorkflowSnapshot } from '@n8n/api-types';
import type { INodeUi, IWorkflowDb } from '@/Interface';

/**
 * Adapts a workflow snapshot pulled from a PR (a `workflows/<id>.json` export)
 * into the {@link IWorkflowDb} shape expected by `WorkflowDiffView`. Only the
 * fields the diff renderer reads are meaningful; the rest get safe defaults.
 */
export function snapshotToWorkflowDb(snapshot: ReviewWorkflowSnapshot): IWorkflowDb {
	return {
		id: snapshot.id,
		name: snapshot.name,
		active: false,
		isArchived: false,
		createdAt: 0,
		updatedAt: 0,
		// Exported nodes carry `position`; UI-only fields are optional on INodeUi.
		nodes: snapshot.nodes as INodeUi[],
		connections: snapshot.connections,
		// n8n-workflow's IWorkflowSettings is structurally compatible here.
		settings: snapshot.settings as IWorkflowDb['settings'],
		versionId: snapshot.versionId ?? '',
		activeVersionId: null,
	};
}
