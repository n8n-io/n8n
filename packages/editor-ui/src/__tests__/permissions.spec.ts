import {
	getVariablesPermissions,
	getProjectPermissions,
	getCredentialPermissions,
	getWorkflowPermissions,
} from '@/permissions';
import type { ICredentialsResponse, IUser, IWorkflowDb } from '@/Interface';
import type { Project } from '@/types/projects.types';

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
			getProjectPermissions({
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
	});

	it('getCredentialPermissions', () => {
		expect(
			getCredentialPermissions({
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
	});

	it('getWorkflowPermissions', () => {
		expect(
			getWorkflowPermissions({
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
	});
});
