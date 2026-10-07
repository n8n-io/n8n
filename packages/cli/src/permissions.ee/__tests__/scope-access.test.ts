import { getScopeAccessResource } from '../scope-access';

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
	});

	it('throws when no supported route parameter is present', () => {
		expect(() => getScopeAccessResource({})).toThrow(
			'`@ProjectScope` decorator was used but does not have a `credentialId`',
		);
	});
});
