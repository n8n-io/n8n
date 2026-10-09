import { ScopeAccessService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { getScopeAccessResource, hasScopes } from '../scope-access';

describe('getScopeAccessResource', () => {
	it('preserves route parameter precedence', () => {
		expect(
			getScopeAccessResource({
				credentialId: 'credential-1',
				workflowId: 'workflow-1',
				dataTableId: 'table-1',
				projectId: 'project-1',
			}),
		).toEqual({ type: 'credential', credentialId: 'credential-1' });

		expect(
			getScopeAccessResource({
				workflowId: 'workflow-1',
				dataTableId: 'table-1',
				projectId: 'project-1',
			}),
		).toEqual({ type: 'workflow', workflowId: 'workflow-1' });

		expect(getScopeAccessResource({ dataTableId: 'table-1', projectId: 'project-1' })).toEqual({
			type: 'moduleResource',
			resourceType: 'dataTable',
			resourceId: 'table-1',
		});

		expect(getScopeAccessResource({ projectId: 'project-1' })).toEqual({
			type: 'project',
			projectId: 'project-1',
		});
	});

	it('throws when no supported route parameter is present', () => {
		expect(() => getScopeAccessResource({})).toThrow(
			'`@ProjectScope` decorator was used but does not have a `credentialId`',
		);
	});
});

describe('hasScopes', () => {
	it('checks global scopes without requiring a resource parameter', async () => {
		const scopeAccessService = mock<ScopeAccessService>();
		scopeAccessService.hasGlobalScopes.mockReturnValue(true);
		Container.set(ScopeAccessService, scopeAccessService);
		const user = mock<User>();

		await expect(hasScopes(user, ['license:manage'], true, {})).resolves.toBe(true);
		expect(scopeAccessService.hasGlobalScopes).toHaveBeenCalledWith(user, ['license:manage']);
		expect(scopeAccessService.hasScopes).not.toHaveBeenCalled();
	});
});
