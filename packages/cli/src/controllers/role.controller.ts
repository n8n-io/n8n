import { License } from '@/License';
import { Get, RestController } from '@/decorators';
import { RoleService } from '@/services/role.service';

@RestController('/roles')
export class RoleController {
	constructor(
		private readonly roleService: RoleService,
		private readonly license: License,
	) {}

	@Get('/')
	async listRoles() {
		return this.roleService.listRoles().map((role) => {
			if (role.scope === 'global' && role.name === 'admin') {
				return { ...role, isAvailable: this.license.isAdvancedPermissionsLicensed() };
			}

			return { ...role, isAvailable: true };
		});
	}
}
