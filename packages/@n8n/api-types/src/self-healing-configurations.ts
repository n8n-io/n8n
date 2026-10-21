import { z } from 'zod';

import { Z } from './zod-class';

export class UpdateSelfHealingConfigurationDto extends Z.class({
	scope: z.enum(['all', 'selected']),
	workflowIds: z.array(z.string().min(1).max(36)).default([]),
	reviewerIds: z.array(z.string().uuid()).min(1),
}) {}

export class SaveSelfHealingConfigurationDto extends UpdateSelfHealingConfigurationDto.extend({
	enabled: z.boolean().default(false),
}) {}

export class SetSelfHealingConfigurationEnabledDto extends Z.class({
	enabled: z.boolean(),
}) {}

export type SelfHealingConfigurationDto = SaveSelfHealingConfigurationDto & {
	id: number;
	projectId: string;
	enabledById: string | null;
	lastActivity: string | null;
};

export type SelfHealingConfigurationOptions = {
	workflows: Array<{ id: string; name: string }>;
	reviewers: Array<{
		id: string;
		email: string;
		firstName: string | null;
		lastName: string | null;
	}>;
};
