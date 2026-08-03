import type { ApiKeyScope } from '@n8n/permissions';

import { classifyScope, getReadOnlyScopes, groupScopes, inferSelectionMode } from './apiKeys.utils';

const availableScopes: ApiKeyScope[] = [
	'workflow:create',
	'workflow:read',
	'workflow:list',
	'workflow:activate',
	'workflow:delete',
	'execution:read',
	'credential:create',
	'variable:list',
	'dataTable:read',
	'project:create',
	'folder:read',
	'tag:read',
	'user:list',
	'securityAudit:generate',
];

describe('classifyScope', () => {
	test.each([
		['workflow:read', 'read'],
		['workflow:list', 'read'],
		['execution:read', 'read'],
		['workflow:export', 'read'],
		['workflow:create', 'write'],
		['workflow:update', 'write'],
		['workflow:delete', 'write'],
		['workflow:activate', 'write'],
		['workflow:deactivate', 'write'],
		['execution:retry', 'write'],
		['securityAudit:generate', 'write'],
		['sourceControl:pull', 'write'],
		['communityPackage:install', 'write'],
		['dataTableRow:upsert', 'write'],
	] as Array<[ApiKeyScope, string]>)('classifies %s as %s', (scope, expected) => {
		expect(classifyScope(scope)).toBe(expected);
	});
});

describe('getReadOnlyScopes', () => {
	it('returns only read scopes', () => {
		expect(getReadOnlyScopes(availableScopes)).toEqual([
			'workflow:read',
			'workflow:list',
			'execution:read',
			'variable:list',
			'dataTable:read',
			'folder:read',
			'tag:read',
			'user:list',
		]);
	});
});

describe('groupScopes', () => {
	it('groups scopes into ordered display groups', () => {
		const groups = groupScopes(availableScopes);

		expect(groups.map((group) => group.key)).toEqual([
			'workflowsAndExecutions',
			'credentialsAndVariables',
			'dataTables',
			'projects',
			'foldersTags',
			'members',
			'instanceOperations',
		]);

		expect(groups[0].scopes).toEqual([
			'workflow:create',
			'workflow:read',
			'workflow:list',
			'workflow:activate',
			'workflow:delete',
			'execution:read',
		]);
		expect(groups[4].scopes).toEqual(['folder:read', 'tag:read']);
	});

	it('omits groups without available scopes', () => {
		const groups = groupScopes(['workflow:read', 'user:list']);

		expect(groups.map((group) => group.key)).toEqual(['workflowsAndExecutions', 'members']);
	});

	it('puts unknown resources into fallback groups', () => {
		const groups = groupScopes(['workflow:read', 'newResource:read'] as ApiKeyScope[]);

		expect(groups).toEqual([
			{ key: 'workflowsAndExecutions', isFallback: false, scopes: ['workflow:read'] },
			{ key: 'newResource', isFallback: true, scopes: ['newResource:read'] },
		]);
	});
});

describe('inferSelectionMode', () => {
	it('returns "all" when every available scope is selected', () => {
		expect(inferSelectionMode([...availableScopes].reverse(), availableScopes)).toBe('all');
	});

	it('returns "readOnly" when exactly the read scopes are selected', () => {
		expect(inferSelectionMode(getReadOnlyScopes(availableScopes), availableScopes)).toBe(
			'readOnly',
		);
	});

	it('returns "custom" for partial selections', () => {
		expect(inferSelectionMode(['workflow:read'], availableScopes)).toBe('custom');
	});

	it('returns "custom" for empty selections', () => {
		expect(inferSelectionMode([], availableScopes)).toBe('custom');
	});

	it('returns "custom" when nothing is available', () => {
		expect(inferSelectionMode([], [])).toBe('custom');
	});
});
