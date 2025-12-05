import { assignableProjectRoleSchema } from '@n8n/permissions';
import { Z } from 'zod-class';

export class ChangeUserRoleInProject extends Z.class({
	role: assignableProjectRoleSchema,
}) {}
