import { formatBytes } from '@n8n/utils/number/bytes';

import type { CredentialSummary, ImportedWorkflowPackage } from './package-requirements';
import type { ExportedWorkflowPackage } from './workflow-package-export';

function credentialList(credentials: readonly CredentialSummary[]): string {
	return credentials.map(({ name, type }) => `${name} (${type})`).join(', ');
}

/** Joins the sentences of a tool result and leaves out the empty ones. */
function sentences(...parts: (string | undefined)[]): string {
	return parts.filter((part) => part !== undefined && part.length > 0).join(' ');
}

/**
 * The text result of the export tool. It leaves out the package, so that the response is not
 * twice its size: the package is in the structured content only.
 */
export function describeExport(output: Omit<ExportedWorkflowPackage, 'packageBase64'>): string {
	const { workflowName, sizeBytes, requirements, warnings } = output;
	return sentences(
		`Exported "${workflowName}" as a package of ${formatBytes(sizeBytes)}.`,
		`It needs ${requirements.credentials.length} credential(s) and ${requirements.nodeTypes.length} node type(s).`,
		'The package is in packageBase64 of the structured content.',
		...warnings,
	);
}

/** The text result of the import tool, with what the user must do before the workflow runs. */
export function describeImport(output: ImportedWorkflowPackage): string {
	const { credentialsNeedingSetup: stubs, missingNodeTypes } = output;
	return sentences(
		`${output.created ? 'Created' : 'Updated'} workflow "${output.workflowName}" (${output.workflowId}).`,
		stubs.length > 0
			? `The import created ${stubs.length} empty credential(s). Set them up before the workflow runs: ${credentialList(stubs)}.`
			: undefined,
		missingNodeTypes.length > 0
			? `This instance does not have ${missingNodeTypes.length} node type(s) that the workflow uses: ${missingNodeTypes.join(', ')}. Install them before you publish the workflow.`
			: undefined,
		...output.warnings,
	);
}
