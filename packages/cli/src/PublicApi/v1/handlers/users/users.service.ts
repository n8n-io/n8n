import { Container } from 'typedi';
import type { Role } from '@db/entities/Role';
import { RoleService } from '@/services/role.service';

// @TODO: Refactor
export async function getWorkflowOwnerRole(): Promise<Role> {
	return Container.get(RoleService).findWorkflowOwnerRoleOrFail();
}
