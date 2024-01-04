import type { RoleNames, RoleScopes } from '@/databases/entities/Role';
import { ApplicationError } from 'n8n-workflow';

export class InvalidRoleError extends ApplicationError {
	constructor(scope: RoleScopes, name: RoleNames) {
		super(`Invalid role: ${scope}:${name}`);
	}
}
