import type { PermissionsRecord } from '@/permissions';
import {
	getVariablesPermissions,
	getProjectPermissions,
	getCredentialPermissions,
	getWorkflowPermissions,
	getResourcePermissions,
} from '@/permissions';
import type { ICredentialsResponse, IUser, IWorkflowDb } from '@/Interface';
import type { Project } from '@/types/projects.types';
import type { Scope } from '@n8n/permissions';

describe('permissions', () => {
	it('getVariablesPermissions', () => {
		expect(getVariablesPermissions(null)).toEqual(null);

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
			read: true,
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
					'credential:move',
				],
			} as ICredentialsResponse),
		).toEqual({
			create: true,
			read: true,
			update: true,
			delete: true,
			list: true,
			share: true,
			move: true,
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
					'workflow:move',
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
			move: true,
		});
	});

	it('getResourcePermissions', () => {
		const scopes: Scope[] = [
			'credential:create',
			'credential:delete',
			'credential:list',
			'credential:move',
			'credential:read',
			'credential:share',
			'credential:update',
			'eventBusDestination:list',
			'eventBusDestination:test',
			'project:list',
			'project:read',
			'tag:create',
			'tag:list',
			'tag:read',
			'tag:update',
			'user:list',
			'variable:list',
			'variable:read',
			'workflow:create',
			'workflow:delete',
			'workflow:execute',
			'workflow:list',
			'workflow:move',
			'workflow:read',
			'workflow:share',
			'workflow:update',
		];

		const permissionRecord: PermissionsRecord = {
			credential: {
				create: true,
				delete: true,
				list: true,
				move: true,
				read: true,
				share: true,
				update: true,
			},
			eventBusDestination: {
				list: true,
				test: true,
			},
			project: {
				list: true,
				read: true,
			},
			tag: {
				create: true,
				list: true,
				read: true,
				update: true,
			},
			user: {
				list: true,
			},
			variable: {
				list: true,
				read: true,
			},
			workflow: {
				create: true,
				delete: true,
				execute: true,
				list: true,
				move: true,
				read: true,
				share: true,
				update: true,
			},
		};

		expect(getResourcePermissions(scopes)).toEqual(permissionRecord);
	});
});
