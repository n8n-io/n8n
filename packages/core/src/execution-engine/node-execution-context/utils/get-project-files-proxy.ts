import type { IWorkflowExecuteAdditionalData, ProjectFilesExpressionProxy } from 'n8n-workflow';
import { buildProjectFilesExpressionProxy } from 'n8n-workflow';

/**
 * Builds the `$files` additional key from the per-execution snapshot that
 * `getBase()` (packages/cli) places on `additionalData` when the file-storage
 * module is active. Returns `undefined` when no snapshot is present — the
 * module is disabled or no home project could be resolved — so `$files`
 * is simply absent from the expression sandbox.
 *
 * `.url` mints `${restApiUrl}/files/signed?token=…` lazily on property
 * access; without a signer (editor contexts) it is a placeholder string.
 */
export function getProjectFilesProxy(
	additionalData: IWorkflowExecuteAdditionalData,
): ProjectFilesExpressionProxy | undefined {
	const snapshot = additionalData.projectFilesSnapshot;
	if (!snapshot) return undefined;

	return buildProjectFilesExpressionProxy({
		snapshot,
		signToken: additionalData.signProjectFileToken,
		restApiUrl: additionalData.restApiUrl,
	});
}
