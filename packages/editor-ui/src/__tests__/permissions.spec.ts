import {
	getVariablesPermissions,
	getProjectPermissions,
	getCredentialPermissions,
	getWorkflowPermissions,
} from '@/permissions';
import type { ICredentialsResponse, IUser, IWorkflowDb } from '@/Interface';
import type { Project } from '@/features/projects/projects.types';

describe('permissions', () => {
	it('getVariablesPermissions', () => {
		expect(getVariablesPermissions(null)).toEqual({
			create: false,
			read: false,
			update: false,
			delete: false,
			list: false,
		});

		expect(
			getVariablesPermissions({
				globalScopes: [
					'variable:create',
					'variable:read',
					'variable:update',
					'variable:delete',
					'variable:list',
				],
			} as IUser),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
		});

		expect(
			getVariablesPermissions({
				globalScopes: ['variable:read', 'variable:list'],
			} as IUser),
		).toEqual({
			create: false,
			read: true,
			update: false,
			delete: false,
			list: true,
		});
	});

	it('getProjectPermissions', () => {
		expect(
			getProjectPermissions(null, {
				scopes: [
					'project:create',
					'project:read',
					'project:update',
					'project:delete',
					'project:list',
				],
			} as Project),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
		});

		expect(
			getProjectPermissions(
				{
					globalScopes: [
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'project:list',
					],
				} as IUser,
				null,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
		});

		expect(
			getProjectPermissions(
				{
					globalScopes: ['project:read', 'project:list'],
				} as IUser,
				null,
			),
		).toEqual({
			create: false,
			read: true,
			update: false,
			delete: false,
			list: true,
		});

		expect(
			getProjectPermissions(
				{
					globalScopes: ['project:read', 'project:list'],
				} as IUser,
				{
					scopes: [
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'project:list',
					],
				} as Project,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
		});

		expect(
			getProjectPermissions(
				{
					globalScopes: [
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'project:list',
					],
				} as IUser,
				{
					scopes: ['project:read', 'project:list'],
				} as Project,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
		});
	});

	it('getCredentialPermissions', () => {
		expect(
			getCredentialPermissions(null, null, {
				scopes: [
					'credential:create',
					'credential:read',
					'credential:update',
					'credential:delete',
					'credential:list',
					'credential:share',
				],
			} as ICredentialsResponse),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
		});

		expect(
			getCredentialPermissions(
				{
					globalScopes: ['credential:read', 'credential:list'],
				} as IUser,
				null,
				{
					scopes: [
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:share',
					],
				} as ICredentialsResponse,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
		});

		expect(
			getCredentialPermissions(
				{
					globalScopes: ['credential:read', 'credential:list'],
				} as IUser,
				{
					scopes: ['credential:read', 'credential:list'],
				} as Project,
				{
					scopes: [
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:share',
					],
				} as ICredentialsResponse,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
		});

		expect(
			getCredentialPermissions(
				{
					globalScopes: ['credential:read', 'credential:list'],
				} as IUser,
				null,
				{} as Project,
			),
		).toEqual({
			create: false,
			read: true,
			update: false,
			delete: false,
			list: true,
			share: false,
		});

		expect(
			getCredentialPermissions(
				{
					globalScopes: ['credential:read', 'credential:list'],
				} as IUser,
				{
					scopes: [
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:share',
					],
				} as Project,
				{} as ICredentialsResponse,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
		});

		expect(
			getCredentialPermissions(
				{
					globalScopes: [
						'credential:create',
						'credential:read',
						'credential:update',
						'credential:delete',
						'credential:list',
						'credential:share',
					],
				} as IUser,
				null,
				{
					scopes: ['credential:read', 'credential:list'],
				} as ICredentialsResponse,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
		});
	});

	it('getWorkflowPermissions', () => {
		expect(
			getWorkflowPermissions(null, null, {
				scopes: [
					'workflow:create',
					'workflow:read',
					'workflow:update',
					'workflow:delete',
					'workflow:list',
					'workflow:share',
					'workflow:execute',
				],
			} as IWorkflowDb),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
			execute: true,
		});

		expect(
			getWorkflowPermissions(
				{
					globalScopes: ['workflow:read', 'workflow:list'],
				} as IUser,
				null,
				{
					scopes: [
						'workflow:create',
						'workflow:read',
						'workflow:update',
						'workflow:delete',
						'workflow:list',
						'workflow:share',
						'workflow:execute',
					],
				} as IWorkflowDb,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
			execute: true,
		});

		expect(
			getWorkflowPermissions(
				{
					globalScopes: ['workflow:read', 'workflow:list'],
				} as IUser,
				null,
				{} as IWorkflowDb,
			),
		).toEqual({
			create: false,
			read: true,
			update: false,
			delete: false,
			list: true,
			share: false,
			execute: false,
		});

		expect(
			getWorkflowPermissions(
				{
					globalScopes: ['workflow:read', 'workflow:list'],
				} as IUser,
				{
					scopes: [
						'workflow:create',
						'workflow:read',
						'workflow:update',
						'workflow:delete',
						'workflow:list',
						'workflow:share',
						'workflow:execute',
					],
				} as Project,
				{} as IWorkflowDb,
			),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
			execute: true,
		});
	});
});
