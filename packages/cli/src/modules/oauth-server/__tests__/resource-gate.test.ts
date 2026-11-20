import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { authorizeAgainstGrant } from '@/modules/inbound-auth-core/grant-authorization';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { triggerResourceGate } from '../resource-gate';

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
