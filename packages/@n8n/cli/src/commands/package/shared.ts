import { ApiError } from '../../client';

const BETA_HINT =
	'The n8n Packages API is beta and disabled by default. Enable it on the instance with ' +
	'N8N_PUBLIC_API_PACKAGES_ENABLED=true (requires the n8n Packages license).';

type BlockingIssue =
	| {
			type: 'workflow-conflict';
			sourceWorkflowId: string;
			existingWorkflowId: string;
			name: string;
	  }
	| { type: 'credential-unresolved'; kind: string; sourceId: string; usedByWorkflows: string[] };

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
	if (error.statusCode === 404) {
		return new ApiError(error.statusCode, error.message, BETA_HINT, error.details);
	}
	const hint = issuesHint(error.details);
	if (hint) {
		return new ApiError(error.statusCode, error.message, hint, error.details);
	}
	return error;
}
