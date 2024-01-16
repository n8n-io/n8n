import Container from 'typedi';
import { RoleService } from '@/services/role.service';

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
	return await Promise.all([getWorkflowOwnerRole(), getCredentialOwnerRole()]);
}
