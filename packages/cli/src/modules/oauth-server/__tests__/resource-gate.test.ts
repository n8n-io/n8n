import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { authorizeAgainstGrant, triggerResourceGate } from '../resource-gate';

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

describe('triggerResourceGate', () => {
	const grant = { audiences: ['aud-a', 'aud-b'], executeAccessWorkflowId: 'wf-1' };

	it('seals the grant it was built from', () => {
		expect(triggerResourceGate(workflowFinderService, grant).getGrant?.()).toEqual(grant);
	});

	// The invariant the whole grant mechanism rests on: whichever side of the resource's
	// lifetime the check happens on, it is the same check.
	it.each([
		['grants', ['wf-1'], true],
		['denies', [], false],
	])('%s alike whether asked live or via the sealed grant', async (_, accessible, expected) => {
		withExecuteAccessTo(...accessible);
		const gate = triggerResourceGate(workflowFinderService, grant);

		await expect(gate.authorize(user)).resolves.toBe(expected);
		await expect(
			authorizeAgainstGrant(workflowFinderService, gate.getGrant!(), user),
		).resolves.toBe(expected);
	});
});
