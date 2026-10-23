import { classifyRestError } from '@n8n/backend-services';
import { serializeInternalRestError, serializePublicApiError } from '@n8n/backend-services';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { WorkflowPublishBlockedError } from '@/errors/response-errors/workflow-publish-blocked.error';
import { toImportBlockedError } from '@/modules/n8n-packages/engine/import-blocked.error';
import type { BlockingIssue } from '@/modules/n8n-packages/n8n-packages.types';
import { PromotionsWorkflowsMovedCrossProjectError } from '@/modules/promotions.ee/promotions-selective-push.error';
import { PolicyViolationError } from '@/policy/policy-violation.error';

describe('rest-error-response', () => {
	it('serializePublicApiError: does not expose internal-only response error meta', () => {
		const descriptor = classifyRestError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl: 'https://n8n.io/legal/eula/',
			}),
		);
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: { message: 'License activation requires EULA acceptance' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 400,
			body: {
				code: 400,
				message: 'License activation requires EULA acceptance',
				meta: { eulaUrl: 'https://n8n.io/legal/eula/' },
			},
		});
	});

	it('serializePublicApiError: exposes cross-project moved workflow ids for selective promote', () => {
		const descriptor = classifyRestError(
			new PromotionsWorkflowsMovedCrossProjectError(['wf-moved']),
		);

		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: {
				message:
					'These workflows moved to another project: wf-moved. A selective push cannot move them. Push all projects instead.',
				meta: {
					code: 'promotions-workflows-moved-cross-project',
					workflowIds: ['wf-moved'],
				},
			},
		});
	});

	it('returns review details publicly while keeping editor-only validation metadata internal', () => {
		const descriptor = classifyRestError(
			new WorkflowPublishBlockedError({
				reason: 'changes_requested',
				workflowReviewRequestId: 'review-1',
			}),
		);

		expect(serializePublicApiError(descriptor)).toEqual({
			status: 409,
			body: {
				message: expect.stringContaining('requested changes'),
				reason: 'changes_requested',
				workflowReviewRequestId: 'review-1',
			},
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 409,
			body: {
				code: 409,
				message: expect.stringContaining('requested changes'),
				meta: {
					reason: 'changes_requested',
					workflowReviewRequestId: 'review-1',
					validationError: true,
				},
			},
		});
	});

	it('serializePublicApiError: 422 with issues when only credentials are unresolved', () => {
		const issues: BlockingIssue[] = [
			{
				type: 'credential-unresolved' as const,
				kind: 'not_found' as const,
				sourceId: 'cred-1',
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
			},
		];
		const descriptor = classifyRestError(toImportBlockedError(issues));

		const result = serializePublicApiError(descriptor);
		expect(result.status).toBe(422);
		expect(result.body).toEqual({ message: expect.stringContaining('Import blocked'), issues });
	});

	it('serializePublicApiError: 409 with issues when a workflow conflicts', () => {
		const issues: BlockingIssue[] = [
			{
				type: 'workflow-conflict' as const,
				sourceWorkflowId: 'wf-1',
				existingWorkflowId: 'local-1',
				name: 'Existing',
			},
			{
				type: 'credential-unresolved' as const,
				kind: 'not_found' as const,
				sourceId: 'cred-1',
				usedBy: [{ kind: 'workflow', id: 'wf-1' }],
			},
		];
		const descriptor = classifyRestError(toImportBlockedError(issues));

		const result = serializePublicApiError(descriptor);
		expect(result.status).toBe(409);
		expect(result.body).toEqual({ message: expect.stringContaining('Import blocked'), issues });
	});

	it('both serializers expose policy violations on a 403', () => {
		const violations = [
			{
				kind: 'node-type-unavailable',
				checkId: 'node-type-availability',
				message: 'Slack is not available in this project',
				subject: 'n8n-nodes-base.slack',
				subjectType: 'nodeType',
			},
		];
		const descriptor = classifyRestError(new PolicyViolationError([violations[0]]));

		expect(serializePublicApiError(descriptor)).toEqual({
			status: 403,
			body: {
				message: 'Slack is not available in this project',
				violations,
			},
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 403,
			body: {
				code: 403,
				message: 'Slack is not available in this project',
				meta: { violations },
			},
		});
	});
});
