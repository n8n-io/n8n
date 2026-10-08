import type { CredentialsFinderService } from '@n8n/backend-services';
import type { WorkflowEntity } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { expectRejection, user } from '../../__tests__/linked-instances.test-helpers';
import type { LocalPackageImport } from '../local-package-import';
import type { LocalWorkflowDeactivator } from '../local-workflow-deactivator';
import { TRANSFER_MESSAGES } from '../transfer-errors';
import { describeSubWorkflowCalls, TransferLocalWorkflows } from '../transfer-local-workflows';
import { workflowEntity } from './transfer.test-helpers';

const calls = (count: number) =>
	Array.from({ length: count }, (_, i) => ({ id: `wf-${i + 1}`, name: `Step ${i + 1}` }));

describe('describeSubWorkflowCalls', () => {
	it('names a workflow that the user can read, and gives the id of another', () => {
		expect(
			describeSubWorkflowCalls([
				{ id: 'wf-2', name: 'Send invoice' },
				{ id: 'wf-3', name: null },
			]),
		).toBe('"Send invoice" (wf-2), "wf-3"');
	});

	it('names five workflows at most', () => {
		expect(describeSubWorkflowCalls(calls(5))).toBe(
			'"Step 1" (wf-1), "Step 2" (wf-2), "Step 3" (wf-3), "Step 4" (wf-4), "Step 5" (wf-5)',
		);
		expect(describeSubWorkflowCalls(calls(6))).toBe(
			'"Step 1" (wf-1), "Step 2" (wf-2), "Step 3" (wf-3), "Step 4" (wf-4), "Step 5" (wf-5), and 1 more',
		);
		expect(describeSubWorkflowCalls(calls(12))).toMatch(/"Step 5" \(wf-5\), and 7 more$/);
	});
});

describe('TransferLocalWorkflows.findMovable', () => {
	/** `found` decides what the finder returns for the scopes of a request. */
	function setup(found: (scopes: Scope[]) => WorkflowEntity | null) {
		const workflowFinder = mock<WorkflowFinderService>();
		workflowFinder.findWorkflowForUser.mockImplementation(async (_id, _user, scopes) =>
			found(scopes),
		);
		const local = new TransferLocalWorkflows(
			workflowFinder,
			mock<CredentialsFinderService>(),
			mock<LocalWorkflowDeactivator>(),
			mock<LocalPackageImport>(),
		);
		return { local, workflowFinder };
	}

	it('finds the workflow with the scopes of the export', async () => {
		const workflow = workflowEntity();
		const { local, workflowFinder } = setup(() => workflow);
		const alice = user();

		expect(await local.findMovable(alice, 'wf1')).toBe(workflow);
		expect(workflowFinder.findWorkflowForUser).toHaveBeenCalledTimes(1);
		expect(workflowFinder.findWorkflowForUser).toHaveBeenCalledWith('wf1', alice, [
			'workflow:read',
			'workflow:export',
		]);
	});

	it('answers 403 to a user who can read the workflow but cannot export it, before any state check', async () => {
		const { local } = setup((scopes) =>
			scopes.includes('workflow:export') ? null : workflowEntity({ isArchived: true }),
		);

		await expectRejection(
			local.findMovable(user(), 'wf1'),
			ForbiddenError,
			TRANSFER_MESSAGES.cannotExport,
		);
	});

	it('answers 404, not 403, to a user who cannot read the workflow', async () => {
		const { local } = setup(() => null);

		await expectRejection(
			local.findMovable(user(), 'wf1'),
			NotFoundError,
			TRANSFER_MESSAGES.workflowNotFound,
		);
	});

	it('refuses an archived workflow that the user can export', async () => {
		const { local } = setup(() => workflowEntity({ isArchived: true }));

		await expectRejection(
			local.findMovable(user(), 'wf1'),
			BadRequestError,
			TRANSFER_MESSAGES.archived,
		);
	});
});
