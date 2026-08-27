import type { ContentImportPolicyResult } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ContentImportContext } from '@n8n/decorators';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import type { PolicyEnforcementService } from './policy-enforcement.service';

/**
 * Evaluates the content-import policy for one artifact, never rejecting: `evaluateContentImport`
 * is documented to never throw, but an import/pull batch must never fail because of policy
 * regardless of that guarantee holding, so an unexpected error is logged and treated as no
 * violations rather than propagated.
 */
export async function evaluateContentImportSafely(
	policyEnforcementService: PolicyEnforcementService,
	context: ContentImportContext,
	logger: Logger,
): Promise<ContentImportPolicyResult> {
	// A feature that is merely absent must not cost anything — same guard as
	// PolicyLifecycleHandler.onWorkflowExecuteBefore for `workflowStart`.
	if (!policyEnforcementService.hasChecksFor('contentImport')) {
		return { violations: [], checkErrors: [] };
	}

	try {
		const { violations, checkErrors = [] } =
			await policyEnforcementService.evaluateContentImport(context);

		// Reporting checkErrors (like violations) is the caller's call — it already logs both.
		return { violations, checkErrors };
	} catch (error) {
		logger.warn(
			`Content-import policy evaluation failed for workflow ${context.workflow.id ?? '(new)'}`,
			{ error: ensureError(error) },
		);
		return { violations: [], checkErrors: [] };
	}
}
