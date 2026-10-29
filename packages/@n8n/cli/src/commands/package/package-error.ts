import type { ImportBlockingIssue } from '@n8n/api-types';
import { ApiError } from '../../client';

type RequirementConsumer = { kind: string; id: string };

type DataTableSchemaChange = NonNullable<
	Extract<ImportBlockingIssue, { type: 'data-table-unresolved' }>['overwriteChanges']
>[number];

function describeSchemaChange(change: DataTableSchemaChange): string {
	switch (change.kind) {
		case 'add-column':
			return `add column ${change.column}`;
		case 'remove-column':
			return `remove column ${change.column}`;
		case 'change-column-type':
			return `change column ${change.column} from ${change.from} to ${change.to}`;
		case 'rename-column':
			return `rename column ${change.from} to ${change.to}`;
		case 'reorder-columns':
			return 'reorder columns';
		case 'rename-table':
			return `rename table "${change.from}" to "${change.to}"`;
	}
}

function formatConsumers(consumers: RequirementConsumer[] | undefined): string {
	if (!Array.isArray(consumers)) return '';
	return consumers
		.filter((consumer) => typeof consumer?.kind === 'string' && typeof consumer.id === 'string')
		.map(({ kind, id }) => `${kind} ${id}`)
		.join(', ');
}

function formatIssue(issue: unknown): string {
	if (typeof issue !== 'object' || issue === null) return JSON.stringify(issue);
	const it = issue as Partial<ImportBlockingIssue> & Record<string, unknown>;
	if (it.type === 'agent-conflict') {
		const task = it.sourceTaskId ? `, task ${it.sourceTaskId}` : '';
		const targets = Array.isArray(it.targetIds) ? it.targetIds.join(', ') : '';
		return `Agent ${it.sourceAgentId}${task} conflicts in project ${it.projectId} (${it.kind}; targets: ${targets})`;
	}
	if (it.type === 'agent-invalid') {
		return `Agent ${it.sourceAgentId} at ${it.path}: ${it.message}`;
	}
	if (it.type === 'agent-dependency-unresolved') {
		return `Agent ${it.sourceAgentId} in project ${it.projectId}: ${it.dependencyType} ${it.referenceId} is ${it.reason} at ${it.path}`;
	}
	if (it.type === 'agent-policy-violation') {
		const reasons = Array.isArray(it.violations)
			? it.violations.map(({ message }) => message).join('; ')
			: '';
		return `Agent "${it.name}" (${it.sourceAgentId}) refused by policy: ${reasons}`;
	}
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
		const usedBy = formatConsumers(it.usedBy);
		return `credential ${it.sourceId} unresolved (${it.kind}), used by ${usedBy}`;
	}
	if (it.type === 'credential-policy-violation') {
		const usedBy = formatConsumers(it.usedBy);
		const reasons = Array.isArray(it.violations)
			? it.violations.map(({ message }) => message).join('; ')
			: '';
		if (it.targetId) {
			return `update of credential ${it.targetId} (${it.credentialType}) from package credential "${it.name ?? it.sourceId}" (${it.sourceId}) refused by policy: ${reasons}, used by ${usedBy}`;
		}
		return `credential "${it.name ?? it.sourceId}" (${it.sourceId}, ${it.credentialType}) refused by policy: ${reasons}, used by ${usedBy}`;
	}
	if (it.type === 'credential-conflict') {
		const usedBy = formatConsumers(it.usedBy);
		const sources = Array.isArray(it.sourceIds) ? it.sourceIds.join(', ') : '';
		if (it.kind === 'divergent') {
			return `credential "${it.name}" (${it.targetId}) receives different values from package credentials ${sources}, used by ${usedBy}`;
		}
		return `credential "${it.name}" (${it.targetId}) differs from package credential ${sources}, used by ${usedBy}`;
	}
	if (it.type === 'credential-update-forbidden') {
		const usedBy = formatConsumers(it.usedBy);
		const sources = Array.isArray(it.sourceIds) ? it.sourceIds.join(', ') : '';
		return `credential "${it.name}" (${it.targetId}) matches package credential ${sources}, but you lack permission to update it. Use keep-existing or ask its owner. Used by ${usedBy}`;
	}
	if (it.type === 'variable-unresolved') {
		const usedBy = formatConsumers(it.usedBy);
		return `variable "${it.name}" unresolved, used by ${usedBy}`;
	}
	if (it.type === 'variable-conflict') {
		const usedBy = formatConsumers(it.usedBy);
		const scope = it.projectId ? `project ${it.projectId}` : 'the global scope';
		return `variable "${it.name}" in ${scope} holds a different value, used by ${usedBy}`;
	}
	if (it.type === 'variable-limit-exceeded') {
		const usedBy = formatConsumers(it.usedBy);
		const names = Array.isArray(it.names) ? it.names.join(', ') : '';
		return `variable limit reached: ${it.requested} new variable(s) (${names}) with ${it.remaining} of ${it.limit} remaining, used by ${usedBy}`;
	}
	if (it.type === 'missing-node-type') {
		const usedBy = formatConsumers(it.usedBy);
		return `node type ${it.nodeType} @ v${it.typeVersion} missing on this instance, used by ${usedBy}`;
	}
	if (it.type === 'tag-unresolved') {
		const usedBy = formatConsumers(it.usedBy);
		if (it.kind === 'permission-denied') {
			return `tag import requires the ${it.missingScope} scope, needed by ${usedBy}`;
		}
		return `tag "${it.name}" (${it.sourceId}) unresolved (${it.kind}), used by ${usedBy}`;
	}
	if (it.type === 'data-table-unresolved') {
		const usedBy = formatConsumers(it.usedBy);
		if (it.kind === 'permission-denied') {
			return `data table import requires the ${it.missingScope} scope, needed by ${usedBy}`;
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
				? `\n      --data-table-schema-conflict-policy=overwrite would: ${it.overwriteChanges.map((change) => (change.destructive ? `${describeSchemaChange(change)} (values removed)` : describeSchemaChange(change))).join(', ')}`
				: '';
			return `data table "${it.name}" (${it.sourceId}) does not match the package schema (${reasons.join('; ')}), used by ${usedBy}${changes}`;
		}
		if (it.kind === 'name-conflict') {
			const action = it.currentName
				? `"${it.currentName}" (${it.sourceId}) cannot be renamed to "${it.name}"`
				: `"${it.name}" (${it.sourceId}) cannot be created`;
			return `data table ${action}: the name is also used by table ${it.conflictingTableId}, used by ${usedBy}`;
		}
		return `data table "${it.name}" (${it.sourceId}) unresolved (${it.kind}), used by ${usedBy}`;
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
