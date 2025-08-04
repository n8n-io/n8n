'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const check_access_1 = require('../check-access');
describe('userHasScopes', () => {
	const findByWorkflowMock = jest.fn();
	const findByCredentialMock = jest.fn();
	beforeAll(() => {
		di_1.Container.set(
			db_1.SharedWorkflowRepository,
			(0, jest_mock_extended_1.mock)({
				findBy: findByWorkflowMock,
			}),
		);
		di_1.Container.set(
			db_1.SharedCredentialsRepository,
			(0, jest_mock_extended_1.mock)({
				findBy: findByCredentialMock,
			}),
		);
		di_1.Container.set(
			db_1.ProjectRepository,
			(0, jest_mock_extended_1.mock)({
				find: jest.fn().mockResolvedValue([
					{
						id: 'projectId',
						projectRelations: [{ userId: 'userId', role: 'project:admin' }],
					},
				]),
			}),
		);
	});
	beforeEach(() => {
		findByWorkflowMock.mockReset();
		findByCredentialMock.mockReset();
	});
	it.each([
		{
			type: 'workflow',
			id: 'workflowId',
		},
		{
			type: 'credential',
			id: 'credentialId',
		},
	])('should return 404 if the resource is not found', async ({ type, id }) => {
		findByWorkflowMock.mockResolvedValueOnce([]);
		findByCredentialMock.mockResolvedValueOnce([]);
		const user = { id: 'userId', scopes: [], role: 'global:member' };
		const scopes = ['workflow:read', 'credential:read'];
		const params = {
			projectId: 'projectId',
		};
		if (type === 'credential') {
			params.credentialId = id;
		} else {
			params.workflowId = id;
		}
		await expect((0, check_access_1.userHasScopes)(user, scopes, false, params)).rejects.toThrow(
			not_found_error_1.NotFoundError,
		);
	});
	test.each([
		{
			type: 'workflow',
			id: 'workflowId',
			role: 'workflow:member',
			scope: 'workflow:delete',
			userScopes: [],
			expected: false,
		},
		{
			type: 'credential',
			id: 'credentialId',
			role: 'credential:member',
			scope: 'credential:delete',
			userScopes: [],
			expected: false,
		},
		{
			type: 'workflow',
			id: 'workflowId',
			role: 'workflow:editor',
			scope: 'workflow:read',
			userScopes: ['workflow:read'],
			expected: true,
		},
		{
			type: 'credential',
			id: 'credentialId',
			role: 'credential:user',
			scope: 'credential:read',
			userScopes: ['credential:read'],
			expected: true,
		},
	])(
		'should return $expected if the user has the required scopes for a $type',
		async ({ type, id, role, scope, userScopes, expected }) => {
			if (type === 'workflow') {
				findByWorkflowMock.mockResolvedValueOnce([
					{
						workflowId: id,
						projectId: 'projectId',
						role,
					},
				]);
			} else {
				findByCredentialMock.mockResolvedValueOnce([
					{
						credentialId: id,
						projectId: 'projectId',
						role,
					},
				]);
			}
			const user = {
				id: 'userId',
				scopes: userScopes,
				role: 'global:member',
			};
			const scopes = [scope];
			const params = {
				projectId: 'projectId',
			};
			if (type === 'credential') {
				params.credentialId = id;
			} else {
				params.workflowId = id;
			}
			const result = await (0, check_access_1.userHasScopes)(user, scopes, false, params);
			expect(result).toBe(expected);
		},
	);
});
//# sourceMappingURL=check-access.test.js.map
