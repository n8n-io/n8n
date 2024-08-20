import { Get, RestController } from '@/decorators';
import { type AllRoleTypes, RoleService } from '@/services/role.service';

@RestController('/roles')
export class RoleController {
	constructor(private readonly roleService: RoleService) {}

	@Get('/')
	async getAllRoles() {
		return Object.fromEntries(
			Object.entries(this.roleService.getRoles()).map((e) => [
				e[0],
				(e[1] as AllRoleTypes[]).map((r) => ({
					name: this.roleService.getRoleName(r),
					role: r,
					scopes: this.roleService.getRoleScopes(r),
					licensed: this.roleService.isRoleLicensed(r),
				})),
			]),
		);
	}
}
