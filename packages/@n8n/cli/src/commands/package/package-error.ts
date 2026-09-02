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
	  };

function formatIssue(issue: unknown): string {
	if (typeof issue !== 'object' || issue === null) return JSON.stringify(issue);
	const it = issue as Partial<BlockingIssue> & Record<string, unknown>;
	if (it.type === 'workflow-conflict') {
		return `workflow "${it.name}" (source ${it.sourceWorkflowId}) already exists as ${it.existingWorkflowId}`;
	}
	if (it.type === 'workflow-lineage-conflict') {
		const workflows = Array.isArray(it.existingWorkflows)
			? it.existingWorkflows.map(({ id, name }) => `"${name}" (${id})`).join(', ')
			: '';
		return `source workflow ${it.sourceWorkflowId} matches multiple workflows in project ${it.projectId}: ${workflows}`;
	}
	if (it.type === 'project-conflict') {
		return `project "${it.name}" (source ${it.sourceProjectId}) already exists on this instance`;
	}
	if (it.type === 'workflow-removal-forbidden') {
		return `workflow "${it.name}" (${it.workflowId}) in project ${it.projectId} is not in the package and would be removed, but you lack permission to remove it`;
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
