import type { SharedCardRule } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { SharedCardAccess } from '../shared-card-access';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const teammate = mock<User>({ id: 'teammate-1' });
const access = new SharedCardAccess();
const hasScopes = vi.mocked(userHasScopes);

const ruleOn = (type: SharedCardRule['target']['type']): SharedCardRule => ({
	scopes: ['workflow:delete'],
	target: { type, id: `${type}-1` },
});

describe('SharedCardAccess', () => {
	beforeEach(() => {
		hasScopes.mockReset();
	});

	it.each([
		['workflow', { workflowId: 'workflow-1' }],
		['credential', { credentialId: 'credential-1' }],
		['dataTable', { dataTableId: 'dataTable-1' }],
		['project', { projectId: 'project-1' }],
	] as const)('checks the scopes of the teammate on a %s', async (type, ids) => {
		hasScopes.mockResolvedValue(true);

		await expect(access.canAnswer(teammate, ruleOn(type))).resolves.toBe(true);
		expect(hasScopes).toHaveBeenCalledWith(teammate, ['workflow:delete'], false, ids);
	});

	it('refuses a teammate without the scopes', async () => {
		hasScopes.mockResolvedValue(false);

		await expect(access.canAnswer(teammate, ruleOn('workflow'))).resolves.toBe(false);
	});

	it('refuses a resource that does not exist', async () => {
		hasScopes.mockRejectedValue(new NotFoundError('Workflow with ID "workflow-1" not found.'));

		await expect(access.canAnswer(teammate, ruleOn('workflow'))).resolves.toBe(false);
	});

	it('passes on other errors', async () => {
		hasScopes.mockRejectedValue(new Error('Database is down'));

		await expect(access.canAnswer(teammate, ruleOn('workflow'))).rejects.toThrow(
			'Database is down',
		);
	});
});
