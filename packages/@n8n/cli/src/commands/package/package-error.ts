import { ApiError } from '../../client';

type BlockingIssue =
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| {
			type: 'workflow-lineage-conflict';
			sourceWorkflowId: string;
			projectId: string;
			existingWorkflows: Array<{ id: string; name: string; isArchived: boolean }>;
	  }
	| { type: 'project-conflict'; sourceProjectId: string; name: string }
	| { type: 'workflow-removal-forbidden'; workflowId: string; name: string; projectId: string }
	| {
			type: 'workflow-removal-conflict';
			sourceWorkflowId: string;
			workflowId: string;
			projectId: string;
	  }
	| {
			type: 'workflow-archive-forbidden';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
			projectId: string;
			transition: 'archive' | 'unarchive';
	  }
	| { type: 'folder-removal-forbidden'; folderId: string; name: string; projectId: string }
	| { type: 'credential-unresolved'; kind: string; sourceId: string; usedByWorkflows: string[] }
	| { type: 'variable-unresolved'; name: string; usedByWorkflows: string[] }
	| { type: 'variable-conflict'; name: string; projectId?: string; usedByWorkflows: string[] }
	| {
			type: 'variable-limit-exceeded';
			limit: number;
			remaining: number;
			requested: number;
			names: string[];
			usedByWorkflows: string[];
	  }
	| {
			type: 'missing-node-type';
			nodeType: string;
			typeVersion: number;
			usedByWorkflows: string[];
	  }
	| {
			type: 'tag-unresolved';
			kind: string;
			sourceId?: string;
			name?: string;
			missingScope?: string;
			usedByWorkflows: string[];
	  }
	| {
			type: 'data-table-unresolved';
			kind: string;
			sourceId?: string;
			name?: string;
			missingScope?: string;
			missingColumns?: string[];
			typeMismatches?: Array<{ column: string }>;
			extraColumns?: string[];
			overwriteChanges?: DataTableSchemaChange[];
			usedByWorkflows: string[];
	  };

type DataTableSchemaChange = { destructive?: boolean } & (
	| { kind: 'add-column'; column: string }
	| { kind: 'remove-column'; column: string }
	| { kind: 'change-column-type'; column: string; from: string; to: string }
	| { kind: 'reorder-columns' }
	| { kind: 'rename-table'; from: string; to: string }
);

function describeSchemaChange(change: DataTableSchemaChange): string {
	switch (change.kind) {
		case 'add-column':
			return `add column ${change.column}`;
		case 'remove-column':
			return `remove column ${change.column}`;
		case 'change-column-type':
			return `change column ${change.column} from ${change.from} to ${change.to}`;
		case 'reorder-columns':
			return 'reorder columns';
		case 'rename-table':
			return `rename table "${change.from}" to "${change.to}"`;
	}
}

function formatIssue(issue: unknown): string {
	if (typeof issue !== 'object' || issue === null) return JSON.stringify(issue);
	const it = issue as Partial<BlockingIssue> & Record<string, unknown>;
	if (it.type === 'workflow-conflict') {
		return `workflow "${it.name}" (source ${it.sourceWorkflowId}) already exists as ${it.existingWorkflowId}`;
	}
	if (it.type === 'workflow-lineage-conflict') {
		const workflows = Array.isArray(it.existingWorkflows)
			? it.existingWorkflows
					.map(({ id, name, isArchived }) => `"${name}" (${id}${isArchived ? ', archived' : ''})`)
					.join(', ')
			: '';
		return `source workflow ${it.sourceWorkflowId} matches multiple workflows in project ${it.projectId}: ${workflows}`;
	}
	if (it.type === 'project-conflict') {
		return `project "${it.name}" (source ${it.sourceProjectId}) already exists on this instance`;
	}
	if (it.type === 'workflow-removal-forbidden') {
		return `workflow "${it.name}" (${it.workflowId}) in project ${it.projectId} could not be removed — not in the package or selected for deletion, and you lack permission`;
	}
	if (it.type === 'workflow-removal-conflict') {
		return `Workflow ${it.workflowId} (source ${it.sourceWorkflowId}) in project ${it.projectId} is selected for both import and deletion. Remove it from one selection.`;
	}
	if (it.type === 'workflow-archive-forbidden') {
		return `workflow "${it.name}" (${it.existingWorkflowId}) in project ${it.projectId} must be ${it.transition}d to match the package, but you lack permission to do so`;
	}
	if (it.type === 'folder-removal-forbidden') {
		return `folder "${it.name}" (${it.folderId}) in project ${it.projectId} is not in the package and would be removed, but you lack permission to remove it`;
	}
	if (it.type === 'credential-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `credential ${it.sourceId} unresolved (${it.kind}), used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'variable-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `variable "${it.name}" unresolved, used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'variable-conflict') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		const scope = it.projectId ? `project ${it.projectId}` : 'the global scope';
		return `variable "${it.name}" in ${scope} holds a different value, used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'variable-limit-exceeded') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		const names = Array.isArray(it.names) ? it.names.join(', ') : '';
		return `variable limit reached: ${it.requested} new variable(s) (${names}) with ${it.remaining} of ${it.limit} remaining, used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'missing-node-type') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `node type ${it.nodeType} @ v${it.typeVersion} missing on this instance, used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'tag-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		if (it.kind === 'permission-denied') {
			return `tag import requires the ${it.missingScope} scope, needed by workflow(s) ${usedBy}`;
		}
		return `tag "${it.name}" (${it.sourceId}) unresolved (${it.kind}), used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'data-table-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		if (it.kind === 'permission-denied') {
			return `data table import requires the ${it.missingScope} scope, needed by workflow(s) ${usedBy}`;
		}
		if (it.kind === 'schema-incompatible') {
			const reasons = [
				it.missingColumns?.length ? `missing columns: ${it.missingColumns.join(', ')}` : '',
				it.typeMismatches?.length
					? `different types: ${it.typeMismatches.map(({ column }) => column).join(', ')}`
					: '',
				it.extraColumns?.length ? `extra columns: ${it.extraColumns.join(', ')}` : '',
			].filter(Boolean);
			const changes = it.overwriteChanges?.length
				? `\n      --data-table-schema-conflict-policy=overwrite would: ${it.overwriteChanges.map((change) => (change.destructive ? `${describeSchemaChange(change)} (data lost)` : describeSchemaChange(change))).join(', ')}`
				: '';
			return `data table "${it.name}" (${it.sourceId}) does not match the package schema (${reasons.join('; ')}), used by workflow(s) ${usedBy}${changes}`;
		}
		return `data table "${it.name}" (${it.sourceId}) unresolved (${it.kind}), used by workflow(s) ${usedBy}`;
	}
	return JSON.stringify(issue);
}

function issuesHint(details: unknown): string | undefined {
	if (typeof details !== 'object' || details === null) return undefined;
	const issues = (details as { issues?: unknown }).issues;
	if (!Array.isArray(issues) || issues.length === 0) return undefined;
	return ['Blocking issues:', ...issues.map((issue) => `  - ${formatIssue(issue)}`)].join('\n');
}

export function toPackagesError(error: unknown): unknown {
	if (!(error instanceof ApiError)) return error;
	const hint = issuesHint(error.details);
	if (hint) {
		return new ApiError(error.statusCode, error.message, hint, error.details);
	}
	return error;
}
