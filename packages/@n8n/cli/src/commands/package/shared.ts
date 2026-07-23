import { ApiError } from '../../client';

type BlockingIssue =
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| { type: 'credential-unresolved'; kind: string; sourceId: string; usedByWorkflows: string[] }
	| { type: 'variable-unresolved'; name: string; usedByWorkflows: string[] }
	| {
			type: 'missing-node-type';
			nodeType: string;
			typeVersion: number;
			usedByWorkflows: string[];
	  };

function formatIssue(issue: unknown): string {
	if (typeof issue !== 'object' || issue === null) return JSON.stringify(issue);
	const it = issue as Partial<BlockingIssue> & Record<string, unknown>;
	if (it.type === 'workflow-conflict') {
		return `workflow "${it.name}" (source ${it.sourceWorkflowId}) already exists as ${it.existingWorkflowId}`;
	}
	if (it.type === 'credential-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `credential ${it.sourceId} unresolved (${it.kind}), used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'variable-unresolved') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `variable "${it.name}" unresolved, used by workflow(s) ${usedBy}`;
	}
	if (it.type === 'missing-node-type') {
		const usedBy = Array.isArray(it.usedByWorkflows) ? it.usedByWorkflows.join(', ') : '';
		return `node type ${it.nodeType} @ v${it.typeVersion} missing on this instance, used by workflow(s) ${usedBy}`;
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
