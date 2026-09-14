import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateSlackAgentAppDto extends Z.class({
	appConfigurationToken: z.string().min(1),
}) {}

export class InstallSlackManagedAppDto extends Z.class({
	managerCredentialId: z.string().min(1),
	workspaceId: z.string().min(1),
}) {}

export class UpdateSlackManagedAppSettingsDto extends Z.class({
	credentialId: z.string().min(1),
	name: z.string().trim().min(1).max(80),
	description: z.string().trim().min(1).max(140),
	alwaysOnline: z.boolean(),
}) {}
