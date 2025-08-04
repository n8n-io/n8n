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
exports.RoleController = void 0;
const decorators_1 = require('@n8n/decorators');
const role_service_1 = require('@/services/role.service');
let RoleController = class RoleController {
	constructor(roleService) {
		this.roleService = roleService;
	}
	getAllRoles() {
		return this.roleService.getAllRoles();
	}
};
exports.RoleController = RoleController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', void 0),
	],
	RoleController.prototype,
	'getAllRoles',
	null,
);
exports.RoleController = RoleController = __decorate(
	[
		(0, decorators_1.RestController)('/roles'),
		__metadata('design:paramtypes', [role_service_1.RoleService]),
	],
	RoleController,
);
//# sourceMappingURL=role.controller.js.map
