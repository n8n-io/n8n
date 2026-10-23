import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { authorizeAgainstGrant } from '../grant-authorization';

const user = mock<User>({ id: 'user-1' });
const workflowFinderService = mock<WorkflowFinderService>();

const withExecuteAccessTo = (...workflowIds: string[]) => {
	workflowFinderService.findWorkflowIdsWithScopeForUser.mockImplementation(
		async (requested) => new Set(requested.filter((id) => workflowIds.includes(id))),
	);
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe('authorizeAgainstGrant', () => {
	it('allows a holder who still has execute access on the named workflow', async () => {
		withExecuteAccessTo('wf-1');

		await expect(
			authorizeAgainstGrant(
				workflowFinderService,
				{ audiences: ['aud'], executeAccessWorkflowId: 'wf-1' },
				user,
			),
		).resolves.toBe(true);
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
			['wf-1'],
			user,
			['workflow:execute'],
		);
	});

	it('denies a holder who has lost it', async () => {
		withExecuteAccessTo();

		await expect(
			authorizeAgainstGrant(
				workflowFinderService,
				{ audiences: ['aud'], executeAccessWorkflowId: 'wf-1' },
				user,
			),
		).resolves.toBe(false);
	});

	it('names no workflow when the trigger does not require execute access', async () => {
		await expect(
			authorizeAgainstGrant(workflowFinderService, { audiences: ['aud'] }, user),
		).resolves.toBe(true);
		expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
	});
});
