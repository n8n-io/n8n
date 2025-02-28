import type { PermissionsRecord } from '@/permissions';
import { getResourcePermissions } from '@/permissions';
import type { Scope } from '@n8n/permissions';

describe('permissions', () => {
	it('getResourcePermissions for empty scopes', () => {
		expect(getResourcePermissions()).toEqual({
			annotationTag: {},
			auditLogs: {},
			banner: {},
			community: {},
			communityPackage: {},
			credential: {},
			externalSecretsProvider: {},
			externalSecret: {},
			eventBusDestination: {},
			ldap: {},
			license: {},
			logStreaming: {},
			orchestration: {},
			project: {},
			saml: {},
			securityAudit: {},
			sourceControl: {},
			tag: {},
			user: {},
			variable: {},
			workersView: {},
			workflow: {},
			folder: {},
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
			'folder:create',
		];

		const permissionRecord: PermissionsRecord = {
			annotationTag: {},
			auditLogs: {},
			banner: {},
			community: {},
			communityPackage: {},
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
			externalSecret: {},
			externalSecretsProvider: {},
			ldap: {},
			license: {},
			logStreaming: {},
			orchestration: {},
			project: {
				list: true,
				read: true,
			},
			saml: {},
			securityAudit: {},
			sourceControl: {},
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
			workersView: {},
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
			folder: {
				create: true,
			},
		};

		expect(getResourcePermissions(scopes)).toEqual(permissionRecord);
	});
});
