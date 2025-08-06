import {
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { userHasScopes } from '../check-access';

describe('userHasScopes', () => {
	const findByWorkflowMock = jest.fn();
	const findByCredentialMock = jest.fn();

	beforeAll(() => {
		Container.set(
			SharedWorkflowRepository,
			mock<SharedWorkflowRepository>({
				findBy: findByWorkflowMock,
			}),
		);

		Container.set(
			SharedCredentialsRepository,
			mock<SharedCredentialsRepository>({
				findBy: findByCredentialMock,
			}),
		);

		Container.set(
			ProjectRepository,
			mock<ProjectRepository>({
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

	it.each<{ type: 'workflow' | 'credential'; id: string }>([
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

		const user = { id: 'userId', scopes: [], role: 'global:member' } as unknown as User;
		const scopes = ['workflow:read', 'credential:read'] as Scope[];

		const params: { credentialId?: string; workflowId?: string; projectId?: string } = {
			projectId: 'projectId',
		};
		if (type === 'credential') {
			params.credentialId = id;
		} else {
			params.workflowId = id;
		}
		await expect(userHasScopes(user, scopes, false, params)).rejects.toThrow(NotFoundError);
	});

	test.each<{
		type: 'workflow' | 'credential';
		id: string;
		role: string;
		scope: Scope;
		userScopes: Scope[];
		expected: boolean;
	}>([
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
			} as unknown as User;
			const scopes = [scope] as Scope[];
			const params: { credentialId?: string; workflowId?: string; projectId?: string } = {
				projectId: 'projectId',
			};
			if (type === 'credential') {
				params.credentialId = id;
			} else {
				params.workflowId = id;
			}
			const result = await userHasScopes(user, scopes, false, params);
			expect(result).toBe(expected);
		},
	);
});
