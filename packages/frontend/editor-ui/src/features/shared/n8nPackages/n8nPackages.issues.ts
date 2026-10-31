import type { ImportBlockingIssue } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

/** Returns a short text for a blocking issue. Issue types without a specific text get a generic text. */
export function formatImportBlockingIssue(issue: ImportBlockingIssue): string {
	switch (issue.type) {
		case 'agent-conflict':
			return i18n.baseText('packages.import.issue.agentConflict', {
				interpolate: { id: issue.sourceAgentId },
			});
		case 'agent-invalid':
			return i18n.baseText('packages.import.issue.agentInvalid', {
				interpolate: { id: issue.sourceAgentId, message: issue.message },
			});
		case 'agent-dependency-unresolved':
			return i18n.baseText('packages.import.issue.agentDependency', {
				interpolate: { id: issue.sourceAgentId, referenceId: issue.referenceId },
			});
		case 'agent-policy-violation':
		case 'policy-violation':
			return i18n.baseText('packages.import.issue.policyViolation', {
				interpolate: { name: issue.name },
			});
		case 'credential-policy-violation':
			return i18n.baseText('packages.import.issue.policyViolation', {
				interpolate: { name: issue.name ?? issue.sourceId },
			});
		case 'credential-unresolved':
			return i18n.baseText('packages.import.issue.credentialUnresolved', {
				interpolate: { id: issue.sourceId },
			});
		case 'credential-conflict':
		case 'credential-update-forbidden':
			return i18n.baseText('packages.import.issue.credentialConflict', {
				interpolate: { name: issue.name },
			});
		case 'missing-node-type':
			return i18n.baseText('packages.import.issue.missingNodeType', {
				interpolate: { nodeType: issue.nodeType },
			});
		case 'workflow-conflict':
		case 'workflow-id-conflict':
		case 'workflow-folder-conflict':
			return i18n.baseText('packages.import.issue.workflowConflict', {
				interpolate: { name: issue.name },
			});
		case 'workflow-lineage-conflict':
			return i18n.baseText('packages.import.issue.workflowConflict', {
				interpolate: { name: issue.existingWorkflows[0]?.name ?? issue.sourceWorkflowId },
			});
		case 'folder-conflict':
			return i18n.baseText('packages.import.issue.folderConflict', {
				interpolate: { name: issue.name },
			});
		case 'data-table-unresolved':
			return i18n.baseText('packages.import.issue.dataTableUnresolved', {
				interpolate: { name: issue.name ?? issue.sourceId ?? '' },
			});
		case 'tag-unresolved':
			return i18n.baseText('packages.import.issue.tagUnresolved', {
				interpolate: { name: issue.name ?? issue.sourceId ?? '' },
			});
		case 'variable-unresolved':
			return i18n.baseText('packages.import.issue.variableUnresolved', {
				interpolate: { name: issue.name },
			});
		case 'variable-conflict':
			return i18n.baseText('packages.import.issue.variableConflict', {
				interpolate: { name: issue.name },
			});
		case 'variable-limit-exceeded':
			return i18n.baseText('packages.import.issue.variableLimitExceeded', {
				interpolate: { requested: String(issue.requested), remaining: String(issue.remaining) },
			});
		default:
			return i18n.baseText('packages.import.issue.generic', {
				interpolate: { type: issue.type },
			});
	}
}
