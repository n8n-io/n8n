import Container from 'typedi';
import { RoleService } from '@/services/role.service';

export async function getGlobalOwnerRole() {
	return Container.get(RoleService).findGlobalOwnerRole();
}

export async function getGlobalMemberRole() {
	return Container.get(RoleService).findGlobalMemberRole();
}

export async function getWorkflowOwnerRole() {
	return Container.get(RoleService).findWorkflowOwnerRole();
}

export async function getWorkflowEditorRole() {
	return Container.get(RoleService).findWorkflowEditorRole();
}

export async function getCredentialOwnerRole() {
	return Container.get(RoleService).findCredentialOwnerRole();
}

export async function getAllRoles() {
	return Promise.all([
		getGlobalOwnerRole(),
		getGlobalMemberRole(),
		getWorkflowOwnerRole(),
		getCredentialOwnerRole(),
	]);
}
