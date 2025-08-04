'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.RoleService = void 0;
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const n8n_workflow_1 = require('n8n-workflow');
const license_1 = require('@/license');
let RoleService = class RoleService {
	constructor(license) {
		this.license = license;
	}
	getAllRoles() {
		Object.values(permissions_1.ALL_ROLES).forEach((entries) => {
			entries.forEach((entry) => {
				entry.licensed = this.isRoleLicensed(entry.role);
			});
		});
		return permissions_1.ALL_ROLES;
	}
	addScopes(rawEntity, user, userProjectRelations) {
		const shared = rawEntity.shared;
		const entity = rawEntity;
		entity.scopes = [];
		if (shared === undefined) {
			return entity;
		}
		if (!('active' in entity) && !('type' in entity)) {
			throw new n8n_workflow_1.UnexpectedError(
				'Cannot detect if entity is a workflow or credential.',
			);
		}
		entity.scopes = this.combineResourceScopes(
			'active' in entity ? 'workflow' : 'credential',
			user,
			shared,
			userProjectRelations,
		);
		return entity;
	}
	combineResourceScopes(type, user, shared, userProjectRelations) {
		const globalScopes = (0, permissions_1.getRoleScopes)(user.role, [type]);
		const scopesSet = new Set(globalScopes);
		for (const sharedEntity of shared) {
			const pr = userProjectRelations.find(
				(p) => p.projectId === (sharedEntity.projectId ?? sharedEntity.project.id),
			);
			let projectScopes = [];
			if (pr) {
				projectScopes = (0, permissions_1.getRoleScopes)(pr.role);
			}
			const resourceMask = (0, permissions_1.getRoleScopes)(sharedEntity.role);
			const mergedScopes = (0, permissions_1.combineScopes)(
				{
					global: globalScopes,
					project: projectScopes,
				},
				{ sharing: resourceMask },
			);
			mergedScopes.forEach((s) => scopesSet.add(s));
		}
		return [...scopesSet].sort();
	}
	isRoleLicensed(role) {
		switch (role) {
			case 'project:admin':
				return this.license.isProjectRoleAdminLicensed();
			case 'project:editor':
				return this.license.isProjectRoleEditorLicensed();
			case 'project:viewer':
				return this.license.isProjectRoleViewerLicensed();
			case 'global:admin':
				return this.license.isAdvancedPermissionsLicensed();
			default:
				return true;
		}
	}
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [license_1.License])],
	RoleService,
);
//# sourceMappingURL=role.service.js.map
