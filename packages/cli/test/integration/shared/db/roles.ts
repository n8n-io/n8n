import Container from 'typedi';
import { RoleService } from '@/services/role.service';

export async function getGlobalOwnerRole() {
	return await Container.get(RoleService).findGlobalOwnerRole();
}

export async function getGlobalMemberRole() {
	return await Container.get(RoleService).findGlobalMemberRole();
}

export async function getGlobalAdminRole() {
	return await Container.get(RoleService).findGlobalAdminRole();
}

export async function getWorkflowOwnerRole() {
	return await Container.get(RoleService).findWorkflowOwnerRole();
}

export async function getWorkflowEditorRole() {
	return await Container.get(RoleService).findWorkflowEditorRole();
}

export async function getCredentialOwnerRole() {
	return await Container.get(RoleService).findCredentialOwnerRole();
}

export async function getAllRoles() {
	return await Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
		getWorkflowOwnerRole(),
		getCredentialOwnerRole(),
	]);
}
