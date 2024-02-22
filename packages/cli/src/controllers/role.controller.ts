import { Get, RestController, Authorized } from '@/decorators';
import { RoleService } from '@/services/role.service';

@Authorized()
@RestController('/roles')
export class RoleController {
	constructor(private roleService: RoleService) {}

	@Get('/')
	async getAllRoles() {
		return this.roleService.getRoles();
	}
}
