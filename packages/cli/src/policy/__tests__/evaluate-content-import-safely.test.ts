import { mock } from 'vitest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { ContentImportContext } from '@n8n/decorators';

import { evaluateContentImportSafely } from '../evaluate-content-import-safely';
import type { PolicyEnforcementService } from '../policy-enforcement.service';

describe('evaluateContentImportSafely', () => {
	const logger = mock<Logger>();
	const policyEnforcementService = mock<PolicyEnforcementService>();
	const context: ContentImportContext = {
		workflow: { id: 'workflow-1', name: 'Test Workflow', nodes: [] },
		projectId: 'project-1',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('skips evaluation entirely when nothing is registered for contentImport', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(false);

		const result = await evaluateContentImportSafely(policyEnforcementService, context, logger);

		expect(result).toStrictEqual({ violations: [], checkErrors: [] });
		expect(policyEnforcementService.evaluateContentImport).not.toHaveBeenCalled();
	});

	it('returns violations from a clean evaluation', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		const violation = { kind: 'node-type-unavailable', checkId: 'test.check', message: 'nope' };
		policyEnforcementService.evaluateContentImport.mockResolvedValue({ violations: [violation] });

		const result = await evaluateContentImportSafely(policyEnforcementService, context, logger);

		expect(result).toStrictEqual({ violations: [violation], checkErrors: [] });
	});

	it('returns checkErrors alongside violations, without logging them itself', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		const checkFailure = { checkId: 'test.check', correlationId: 'corr-1' };
		policyEnforcementService.evaluateContentImport.mockResolvedValue({
			violations: [],
			checkErrors: [checkFailure],
		});

		const result = await evaluateContentImportSafely(policyEnforcementService, context, logger);

		expect(result).toStrictEqual({ violations: [], checkErrors: [checkFailure] });
		// Reporting is the caller's job — each call site already logs checkErrors itself, so
		// logging them here too would print every failed check twice.
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('does not fail when evaluateContentImport throws, and logs the error', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.evaluateContentImport.mockRejectedValue(
			new Error('backend unavailable'),
		);

		const result = await evaluateContentImportSafely(policyEnforcementService, context, logger);

		expect(result).toStrictEqual({ violations: [], checkErrors: [] });
		expect(logger.warn).toHaveBeenCalledWith(
			'Content-import policy evaluation failed for workflow workflow-1',
			{ error: expect.any(Error) },
		);
	});

	it('falls back to "(new)" in the failure log message for a workflow with no id yet', async () => {
		policyEnforcementService.hasChecksFor.mockReturnValue(true);
		policyEnforcementService.evaluateContentImport.mockRejectedValue(
			new Error('backend unavailable'),
		);
		const newWorkflowContext: ContentImportContext = {
			workflow: { id: null, name: 'Brand New', nodes: [] },
			projectId: 'project-1',
		};

		await evaluateContentImportSafely(policyEnforcementService, newWorkflowContext, logger);

		expect(logger.warn).toHaveBeenCalledWith(
			'Content-import policy evaluation failed for workflow (new)',
			{ error: expect.any(Error) },
		);
	});
});
