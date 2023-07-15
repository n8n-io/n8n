import { Container } from 'typedi';
import { RoleRepository } from '@db/repositories';
import type { Role } from '@db/entities/Role';

export async function getWorkflowOwnerRole(): Promise<Role> {
	return Container.get(RoleRepository).findWorkflowOwnerRoleOrFail();
}
